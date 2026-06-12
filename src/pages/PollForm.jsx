import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabase";
import { publishVote } from "../lib/mqtt";
import { fetchWeatherLabel } from "../lib/weather";
import { CheckCircleIcon, ArrowPathIcon, MapPinIcon, SunIcon, CloudIcon } from "@heroicons/react/24/outline";

const industries = [
  { id: "Agriculture", label: "Agriculture" },
  { id: "Utilities", label: "Utilities" },
  { id: "Public Safety", label: "Public Safety" },
  { id: "Transportation", label: "Transportation" },
  { id: "Smart City", label: "Smart City" },
];

export default function PollForm() {
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(() => {
    return localStorage.getItem("hasVote") === "true";
  });
  const [error, setError] = useState("");
  const [location, setLocation] = useState(null);
  const [weather, setWeather] = useState(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);

  useEffect(() => {
    // Try to get user location for the poll, then fetch weather
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });

          // Fetch weather from Open-Meteo
          setIsFetchingWeather(true);
          const label = await fetchWeatherLabel(latitude, longitude);
          setWeather(label);
          setIsFetchingWeather(false);
        },
        (err) => {
          console.warn("Geolocation not available or denied:", err);
        }
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIndustry) return;

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        name: name || 'Anonymous',
        industry: selectedIndustry,
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        weather: weather || null,
      };

      const { error: dbError } = await supabase
        .from("votes")
        .insert([payload]);

      if (dbError) throw dbError;

      // Publish to MQTT for ArcGIS Velocity (fire-and-forget)
      publishVote(payload).then(() => {
        console.log('✅ MQTT publish success', JSON.stringify(payload));
      }).catch((err) =>
        console.warn('MQTT publish failed (non-blocking):', err)
      );

      localStorage.setItem("hasVote", "true");
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Failed to submit vote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="glass-panel text-center py-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircleIcon className="w-10 h-10 text-green-500" />
            </motion.div>
            <CardTitle className="text-3xl mb-2">Vote Recorded!</CardTitle>
            <CardDescription className="text-lg">
              Thank you for participating. Check out the dashboard for live results.
            </CardDescription>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="glass-panel border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Industry Survey</CardTitle>
            <CardDescription>
              Which industry do you operate in?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  Select Industry
                </label>
                {industries.map((option) => (
                  <motion.div
                    key={option.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedIndustry(option.id)}
                      className={`w-full flex items-center p-4 rounded-xl border transition-all duration-200 ${selectedIndustry === option.id
                        ? "bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                        : "bg-black/20 border-white/10 hover:bg-white/5"
                        }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${selectedIndustry === option.id ? "border-primary" : "border-white/30"
                          }`}
                      >
                        {selectedIndustry === option.id && (
                          <motion.div
                            layoutId="check"
                            className="w-2.5 h-2.5 rounded-full bg-primary"
                          />
                        )}
                      </div>
                      <span className="font-medium text-lg">{option.label}</span>
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPinIcon className="w-4 h-4" />
                  {location ? "Location captured" : "Waiting for location..."}
                </span>
                <span className="flex items-center gap-1.5">
                  {isFetchingWeather ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Fetching weather...
                    </>
                  ) : weather ? (
                    <>
                      {weather === 'cerah' && <SunIcon className="w-4 h-4 text-amber-400" />}
                      {weather === 'berawan' && <CloudIcon className="w-4 h-4 text-slate-400" />}
                      {weather === 'hujan' && <CloudIcon className="w-4 h-4 text-blue-400" />}
                      <span
                        className={`capitalize font-medium ${
                          weather === 'cerah' ? 'text-amber-400' :
                          weather === 'berawan' ? 'text-slate-300' :
                          'text-blue-400'
                        }`}
                      >
                        {weather}
                      </span>
                    </>
                  ) : location ? (
                    "Weather unavailable"
                  ) : null}
                </span>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <Button
                type="submit"
                disabled={!selectedIndustry || isSubmitting}
                className="w-full h-12 text-lg font-semibold rounded-xl"
              >
                {isSubmitting ? (
                  <>
                    <ArrowPathIcon className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Vote"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
