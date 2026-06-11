import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "../components/ui/card";
import { supabase } from "../lib/supabase";
import { 
  UsersIcon, 
  SignalIcon, 
  MapIcon, 
  ClockIcon, 
  TruckIcon, 
  BoltIcon, 
  BuildingOffice2Icon, 
  GlobeAmericasIcon, 
  ShieldCheckIcon,
  EllipsisHorizontalIcon
} from "@heroicons/react/24/outline";

import "@arcgis/core/assets/esri/themes/dark/main.css";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";

// Map industry to specific tailwind colors and icons
const industryMap = {
  "Transportation": { color: "#6366f1", icon: TruckIcon, colorClass: "text-indigo-500", bgClass: "bg-indigo-500/10", borderClass: "border-indigo-500/30" },
  "Utilities": { color: "#f59e0b", icon: BoltIcon, colorClass: "text-amber-500", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/30" },
  "Smart City": { color: "#06b6d4", icon: BuildingOffice2Icon, colorClass: "text-cyan-500", bgClass: "bg-cyan-500/10", borderClass: "border-cyan-500/30" },
  "Agriculture": { color: "#22c55e", icon: GlobeAmericasIcon, colorClass: "text-green-500", bgClass: "bg-green-500/10", borderClass: "border-green-500/30" },
  "Public Safety": { color: "#ef4444", icon: ShieldCheckIcon, colorClass: "text-red-500", bgClass: "bg-red-500/10", borderClass: "border-red-500/30" },
};

const getIndustryData = (industryName) => {
  return industryMap[industryName] || { color: "#64748b", icon: EllipsisHorizontalIcon, colorClass: "text-slate-500", bgClass: "bg-slate-500/10", borderClass: "border-slate-500/30" };
};

export default function Dashboard() {
  const [votes, setVotes] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  
  const mapDiv = useRef(null);
  const viewRef = useRef(null);
  const graphicsLayerRef = useRef(null);

  useEffect(() => {
    if (mapDiv.current && !viewRef.current) {
      const graphicsLayer = new GraphicsLayer();
      graphicsLayerRef.current = graphicsLayer;

      const map = new Map({
        basemap: "dark-gray-vector",
        layers: [graphicsLayer]
      });

      const view = new MapView({
        container: mapDiv.current,
        map: map,
        center: [0, 20],
        zoom: 2,
        ui: { components: ["zoom"] }
      });

      viewRef.current = view;
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchVotes = async () => {
      const { data, error } = await supabase.from("votes").select("*").order('created_at', { ascending: true });
      if (error) {
        console.error("Error fetching votes:", error);
      } else {
        setVotes(data || []);
        setTotalVotes(data?.length || 0);
      }
    };

    fetchVotes();

    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "votes" },
        (payload) => {
          setVotes((prev) => [...prev, payload.new]);
          setTotalVotes((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Track previous vote count to distinguish initial load from real-time inserts
  const prevVoteCountRef = useRef(0);

  useEffect(() => {
    if (graphicsLayerRef.current && viewRef.current) {
      graphicsLayerRef.current.removeAll();

      const geoVotes = votes.filter(v => v.latitude != null && v.longitude != null);

      geoVotes.forEach(v => {
        const indData = getIndustryData(v.industry);
        const point = { type: "point", longitude: v.longitude, latitude: v.latitude };

        const markerSymbol = {
          type: "simple-marker",
          color: indData.color,
          outline: { color: [255, 255, 255, 0.5], width: 1 },
          size: "10px"
        };

        const pointGraphic = new Graphic({
          geometry: point,
          symbol: markerSymbol,
          attributes: { name: v.name, industry: v.industry },
          popupTemplate: {
            title: "{name}",
            content: "Industry: {industry}"
          }
        });

        graphicsLayerRef.current.add(pointGraphic);
      });

      // Adjust map extent to fit all points
      if (geoVotes.length > 0) {
        const isNewVote = votes.length > prevVoteCountRef.current && prevVoteCountRef.current > 0;

        if (geoVotes.length === 1) {
          // Single point — center on it with a reasonable zoom
          viewRef.current.goTo(
            { center: [geoVotes[0].longitude, geoVotes[0].latitude], zoom: 12 },
            { duration: isNewVote ? 1500 : 800, easing: "ease-in-out" }
          );
        } else {
          // Multiple points — compute extent from all points
          const lons = geoVotes.map(v => v.longitude);
          const lats = geoVotes.map(v => v.latitude);
          const extent = {
            xmin: Math.min(...lons),
            ymin: Math.min(...lats),
            xmax: Math.max(...lons),
            ymax: Math.max(...lats),
            spatialReference: { wkid: 4326 }
          };

          viewRef.current.goTo(
            { target: extent },
            { duration: isNewVote ? 1500 : 800, easing: "ease-in-out" }
          ).then(() => {
            // Add some padding by zooming out 1 level
            if (viewRef.current.zoom > 1) {
              viewRef.current.goTo(
                { zoom: viewRef.current.zoom - 1 },
                { duration: 300, easing: "ease-out" }
              );
            }
          });
        }
      }

      prevVoteCountRef.current = votes.length;
    }
  }, [votes]);

  // Compute stats
  const stats = votes.reduce((acc, vote) => {
    if (vote.industry) {
      acc[vote.industry] = (acc[vote.industry] || 0) + 1;
    }
    return acc;
  }, {});

  const industriesToDisplay = Object.keys(industryMap).map((key) => ({
    name: key,
    value: stats[key] || 0,
    percentage: totalVotes > 0 ? ((stats[key] || 0) / totalVotes) * 100 : 0,
    data: getIndustryData(key)
  })).sort((a, b) => b.value - a.value);

  // Live feed (reversed array for newest first)
  const recentVotes = [...votes].reverse().slice(0, 15);

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-8 bg-[#0a0b10] text-[#f1f1f1]">
      
      {/* Header */}
      <header className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md rounded-2xl sticky top-4 z-50 px-6 py-4 flex items-center justify-between mb-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center animate-pulse shadow-lg">
            <SignalIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Live Polling Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Connected
          </span>
          <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 shadow-sm">
            <MapIcon className="w-3 h-3 mr-1" />
            ArcGIS Velocity
          </span>
        </div>
      </header>

      <main className="space-y-8">
        {/* Total Votes Summary */}
        <div className="bg-gradient-to-br from-indigo-600/10 via-violet-600/10 to-purple-600/10 border border-white/10 backdrop-blur-sm p-8 rounded-xl text-center ring-1 ring-white/5 shadow-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={totalVotes}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl md:text-8xl font-bold tracking-tight bg-gradient-to-br from-white via-white to-white/50 bg-clip-text text-transparent"
            >
              {totalVotes}
            </motion.div>
          </AnimatePresence>
          <div className="text-sm md:text-base text-white/50 mt-4 uppercase tracking-widest font-medium">
            Total Votes Recorded
          </div>
        </div>

        {/* Map & Feed Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <MapIcon className="w-5 h-5 text-white/70" />
              <h2 className="text-lg font-bold">Live Responder Map</h2>
              <span className="text-xs text-white/40 ml-2">Real-Time streaming via ArcGIS</span>
            </div>
            <div className="w-full h-[450px] relative rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/50">
              <div className="w-full h-full" ref={mapDiv}></div>
            </div>
          </div>

          {/* Live Feed */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <SignalIcon className="w-5 h-5 text-white/70" />
              <h2 className="text-lg font-bold">Live Feed</h2>
              <span className="bg-indigo-600/20 text-indigo-400 text-xs ml-auto px-2 py-1 rounded-full border border-indigo-500/20">
                {recentVotes.length} recent
              </span>
            </div>
            <div className="bg-white/[0.02] border border-white/10 backdrop-blur-sm p-4 h-[450px] overflow-hidden rounded-xl ring-1 ring-white/5 shadow-xl flex flex-col">
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                <AnimatePresence initial={false}>
                  {recentVotes.map((vote) => {
                    const iData = getIndustryData(vote.industry);
                    const IconComp = iData.icon;
                    return (
                      <motion.div
                        key={vote.id}
                        initial={{ opacity: 0, y: -20, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 shadow-sm"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iData.bgClass}`}>
                          <IconComp className={`w-4 h-4 ${iData.colorClass}`} />
                        </div>
                        <div className="flex-1 min-w-0 flex items-center flex-wrap gap-1">
                          <span className="font-medium text-sm text-white/90 truncate max-w-[100px]">{vote.name || "Anonymous"}</span>
                          <span className="text-white/40 text-xs mx-1">voted</span>
                          <span className={`inline-flex h-5 w-fit items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${iData.borderClass} ${iData.colorClass} ${iData.bgClass}`}>
                            {vote.industry}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <ClockIcon className="w-3 h-3 text-white/40" />
                          <span className="text-xs text-white/40 tabular-nums">
                            {new Date(vote.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {recentVotes.length === 0 && (
                  <div className="text-center text-white/40 text-sm mt-10">Waiting for votes...</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Industry Breakdown Grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <UsersIcon className="w-5 h-5 text-white/70" />
            <h2 className="text-lg font-bold">Industry Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {industriesToDisplay.map((item) => {
              const IconComp = item.data.icon;
              return (
                <div key={item.name} className="relative overflow-hidden bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 group p-5 rounded-xl shadow-lg ring-1 ring-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${item.data.bgClass}`}>
                        <IconComp className={`w-5 h-5 ${item.data.colorClass}`} />
                      </div>
                      <span className="font-medium text-sm text-white/90">{item.name}</span>
                    </div>
                    <span className="text-3xl font-bold tabular-nums" style={{ color: item.data.color }}>
                      {item.value}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden w-full relative">
                    <div 
                      className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${item.percentage}%`, 
                        backgroundColor: item.data.color,
                        boxShadow: `0 0 10px ${item.data.color}, 0 0 20px ${item.data.color}`
                      }}
                    />
                  </div>
                  <div className="text-right mt-2">
                    <span className="text-xs text-white/50 font-medium tabular-nums">{item.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
