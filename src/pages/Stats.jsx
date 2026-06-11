import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabase";
import { 
  UsersIcon, 
  ArrowTrendingUpIcon, 
  ChartPieIcon, 
  ChartBarIcon,
  TruckIcon, 
  BoltIcon, 
  BuildingOffice2Icon, 
  GlobeAmericasIcon, 
  ShieldCheckIcon,
  EllipsisHorizontalIcon
} from "@heroicons/react/24/outline";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

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

const ESTIMATED_AUDIENCE = 200;

export default function Stats() {
  const [votes, setVotes] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);

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

  const participationRate = ((totalVotes / ESTIMATED_AUDIENCE) * 100).toFixed(1);
  const mostPopular = industriesToDisplay[0]?.value > 0 ? industriesToDisplay[0] : null;

  // Recharts custom Tooltip for Pie/Bar
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1e2029] border border-white/10 p-3 rounded-lg shadow-xl text-white">
          <p className="font-semibold text-sm mb-1">{data.name}</p>
          <p className="text-sm">
            <span className="text-white/60">Votes: </span>
            <span className="font-bold">{data.value}</span>
          </p>
          <p className="text-sm">
            <span className="text-white/60">Share: </span>
            <span className="font-bold">{data.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto flex flex-col dot-pattern text-[#f1f1f1]">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1]">
        <div className="absolute top-[-30%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/6 blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-600/5 blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md rounded-2xl sticky top-4 z-50 px-6 py-4 flex items-center justify-between mb-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <ChartBarIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Statistics</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Data
            </span>
          </div>
        </header>

        <main className="space-y-8">
          {/* Top Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Total Participants */}
            <div className="flex flex-col gap-4 overflow-hidden rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm p-6 ring-1 ring-white/5 shadow-xl transition-transform hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                  <UsersIcon className="w-5 h-5 text-indigo-400" />
                </div>
                <span className="text-sm text-white/60 font-medium">Total Participants</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={totalVotes}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent"
                >
                  {totalVotes}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Participation Rate */}
            <div className="flex flex-col gap-4 overflow-hidden rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm p-6 ring-1 ring-white/5 shadow-xl transition-transform hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-sm text-white/60 font-medium">Participation Rate</span>
              </div>
              <div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={participationRate}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent"
                  >
                    {participationRate}%
                  </motion.p>
                </AnimatePresence>
                <p className="text-xs text-white/40 mt-1">of ~{ESTIMATED_AUDIENCE} estimated audience</p>
              </div>
            </div>

            {/* Most Popular */}
            <div className="flex flex-col gap-4 overflow-hidden rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm p-6 ring-1 ring-white/5 shadow-xl transition-transform hover:scale-[1.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: mostPopular ? mostPopular.data.color + '20' : '#6366f115' }}>
                  {mostPopular ? (
                    <mostPopular.data.icon className="w-5 h-5" style={{ color: mostPopular.data.color }} />
                  ) : (
                    <ArrowTrendingUpIcon className="w-5 h-5 text-indigo-400" />
                  )}
                </div>
                <span className="text-sm text-white/60 font-medium">Most Popular</span>
              </div>
              <div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={mostPopular?.name || 'none'}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-2xl font-bold tracking-tight truncate"
                    style={{ color: mostPopular ? mostPopular.data.color : '#fff' }}
                  >
                    {mostPopular ? mostPopular.name : 'Waiting for votes'}
                  </motion.p>
                </AnimatePresence>
                <p className="text-xs text-white/40 mt-1">
                  {mostPopular ? `${mostPopular.value} votes (${mostPopular.percentage.toFixed(1)}%)` : '0 votes (0%)'}
                </p>
              </div>
            </div>

          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Industry Distribution - Pie Chart */}
            <div className="flex flex-col gap-4 overflow-hidden rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm p-6 ring-1 ring-white/5 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <ChartPieIcon className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold">Industry Distribution</h2>
              </div>
              
              {totalVotes === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-white/40 text-sm">
                  No votes yet
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={industriesToDisplay.filter(i => i.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {industriesToDisplay.filter(i => i.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.data.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        formatter={(value, entry, index) => (
                          <span className="text-white/80 text-sm ml-1">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Industry Comparison - Bar Chart */}
            <div className="flex flex-col gap-4 overflow-hidden rounded-xl bg-white/[0.03] border border-white/10 backdrop-blur-sm p-6 ring-1 ring-white/5 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold">Industry Comparison</h2>
              </div>
              
              {totalVotes === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-white/40 text-sm">
                  No votes yet
                </div>
              ) : (
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={industriesToDisplay.filter(i => i.value > 0)}
                      margin={{ top: 5, right: 30, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#ffffff40" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#ffffff60' }}
                      />
                      <YAxis 
                        stroke="#ffffff40" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#ffffff60' }}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff0a' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {industriesToDisplay.filter(i => i.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.data.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
