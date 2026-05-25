import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  Search, 
  ArrowUpDown, 
  Filter, 
  Dumbbell, 
  Award, 
  Clock, 
  TrendingUp, 
  UserCheck, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Zap,
  Trash2
} from "lucide-react";
import { HistoryEntry, User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface WorkoutHistoryProps {
  history: HistoryEntry[];
  users: { [id: string]: User };
  currentUser: User;
}

export default function WorkoutHistory({ history, users, currentUser }: WorkoutHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // all, day, week, month
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "exercises-count" | "total-sets">("newest");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Available unique workout types in history
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    history.forEach((h) => {
      if (h.workoutType) types.add(h.workoutType);
    });
    return ["all", ...Array.from(types)];
  }, [history]);

  // List of unique users who recorded workouts
  const contributors = useMemo(() => {
    return Object.values(users);
  }, [users]);

  // Helper to filter dates
  const isWithinDateRange = (dateStr: string, range: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    
    // Set hours to 0 to compare days properly
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (range === "today") {
      return date >= startOfToday;
    } else if (range === "week") {
      return date >= startOfWeek;
    } else if (range === "month") {
      return date >= startOfMonth;
    }
    return true; // all
  };

  // Main filtered and sorted memoized list
  const filteredAndSortedHistory = useMemo(() => {
    let result = [...history];

    // 1. Text Search Filter (on Workout Title or Exercise Name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(h => 
        h.workoutTitle.toLowerCase().includes(q) || 
        h.workoutType.toLowerCase().includes(q) ||
        h.exercises.some(ex => ex.name.toLowerCase().includes(q))
      );
    }

    // 2. Workout Type Filter
    if (typeFilter !== "all") {
      result = result.filter(h => h.workoutType.toLowerCase() === typeFilter.toLowerCase());
    }

    // 3. User Filter
    if (userFilter !== "all") {
      result = result.filter(h => h.userId === userFilter);
    }

    // 4. Date Filter
    if (dateFilter !== "all") {
      result = result.filter(h => isWithinDateRange(h.completedAt, dateFilter));
    }

    // 5. Sorting Engine
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime();
      }
      if (sortBy === "exercises-count") {
        return b.exercises.length - a.exercises.length;
      }
      if (sortBy === "total-sets") {
        const totalSetsA = a.exercises.reduce((sum, e) => sum + e.sets, 0);
        const totalSetsB = b.exercises.reduce((sum, e) => sum + e.sets, 0);
        return totalSetsB - totalSetsA;
      }
      return 0;
    });

    return result;
  }, [history, searchQuery, typeFilter, userFilter, dateFilter, sortBy]);

  // Derived Statistics based on filtered history for live charts/widgets
  const stats = useMemo(() => {
    const totalWorkoutLogs = filteredAndSortedHistory.length;
    let totalSetsLogged = 0;
    const typeCounts: { [type: string]: number } = {};
    const userPerformanceMap: { [uid: string]: number } = {};

    filteredAndSortedHistory.forEach((h) => {
      const sets = h.exercises.reduce((acc, curr) => acc + curr.sets, 0);
      totalSetsLogged += sets;

      typeCounts[h.workoutType] = (typeCounts[h.workoutType] || 0) + 1;
      userPerformanceMap[h.userId] = (userPerformanceMap[h.userId] || 0) + 1;
    });

    // Find the current champion (user with most logs)
    let MVP = "None yet";
    let maxLogs = 0;
    Object.entries(userPerformanceMap).forEach(([uid, count]) => {
      if (count > maxLogs) {
        maxLogs = count;
        MVP = users[uid]?.name || "Squad Member";
      }
    });

    return {
      totalWorkoutLogs,
      totalSetsLogged,
      MVP,
      favoriteType: Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None"
    };
  }, [filteredAndSortedHistory, users]);

  // Format lovely visual timestamp
  const formatTimestamp = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const toggleExpandLog = (logId: string) => {
    setExpandedLogId(prev => prev === logId ? null : logId);
  };

  return (
    <div id="workout-history-root" className="space-y-8">
      
      {/* 1. HIGHLIGHT STATS DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-[#111827]/40 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-[#00FF95]/30 transition-all">
          <div className="p-3.5 bg-emerald-500/10 text-[#00FF95] rounded-xl shrink-0">
            <Dumbbell className="w-5 h-5 align-middle" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">Workouts Scaled</span>
            <span className="text-2xl font-black text-white font-mono mt-0.5 block">{stats.totalWorkoutLogs} Sessions</span>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-r from-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-[#111827]/40 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-teal-400/30 transition-all">
          <div className="p-3.5 bg-teal-500/10 text-teal-400 rounded-xl shrink-0">
            <Zap className="w-5 h-5 align-middle" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">Total Sets Done</span>
            <span className="text-2xl font-black text-white font-mono mt-0.5 block">{stats.totalSetsLogged} Sets</span>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-r from-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-[#111827]/40 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-violet-500/30 transition-all">
          <div className="p-3.5 bg-violet-500/10 text-violet-400 rounded-xl shrink-0">
            <Award className="w-5 h-5 align-middle animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">History MVP</span>
            <span className="text-lg font-black text-slate-100 truncate mt-0.5 block max-w-[150px]" title={stats.MVP}>
              {stats.MVP}
            </span>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-r from-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="bg-[#111827]/40 border border-slate-850 p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5 align-middle" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">Preferred Core style</span>
            <span className="text-sm font-black text-amber-200 capitalize mt-1 block truncate max-w-[150px]">
              {stats.favoriteType}
            </span>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-24 bg-gradient-to-r from-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

      </div>

      {/* 2. ADVANCED INTERACTIVE CONTROL TOOLBAR */}
      <div className="bg-[#111827]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
              <Filter className="w-4 h-4 text-[#00FF95]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">Sort & Filter Engine</h3>
              <p className="text-xs text-slate-400">Narrow down workouts by category, user contributes and date spans</p>
            </div>
          </div>
          
          {/* Quick Active Record Indicator */}
          <div className="flex items-center gap-1.5 bg-[#00ff950e] border border-[#00ff951e] px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-[#00FF95] animate-ping" />
            <span className="text-[10px] text-slate-300 font-mono uppercase tracking-wider">
              {filteredAndSortedHistory.length} Matches Found
            </span>
          </div>
        </div>

        {/* INPUT FILTERS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 text-xs">
          
          {/* Text Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-filter-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drill or session..."
              className="w-full bg-slate-900 border border-slate-800 focus:border-[#00FF95] text-[#E0E0E0] rounded-xl pl-9 pr-3 py-2.5 outline-none transition-colors"
            />
          </div>

          {/* Workout Type */}
          <div>
            <select
              id="type-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-[#1c2230] border border-slate-800 focus:border-[#00FF95] text-slate-200 rounded-xl px-3 py-2.5 outline-none font-semibold cursor-pointer"
            >
              <option value="all">🏋️ All Workout Styles</option>
              {availableTypes.filter(t => t !== "all").map(t => (
                <option key={t} value={t} className="capitalize">
                  {t} Focus
                </option>
              ))}
            </select>
          </div>

          {/* User Filtering */}
          <div>
            <select
              id="user-filter-select"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full bg-[#1c2230] border border-slate-800 focus:border-[#00FF95] text-slate-200 rounded-xl px-3 py-2.5 outline-none font-semibold cursor-pointer"
            >
              <option value="all">👥 All Squad Members</option>
              {contributors.map(u => (
                <option key={u.id} value={u.id}>
                  👤 {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filtering */}
          <div>
            <select
              id="date-filter-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full bg-[#1c2230] border border-slate-800 focus:border-[#00FF95] text-slate-200 rounded-xl px-3 py-2.5 outline-none font-semibold cursor-pointer"
            >
              <option value="all">📅 All Time Range</option>
              <option value="today">Today Only</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>

          {/* Sort By Selector */}
          <div>
            <select
              id="sort-by-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-[#141b29] border border-slate-800 focus:border-[#00FF95] text-[#00FF95] rounded-xl px-3 py-2.5 outline-none font-bold cursor-pointer"
            >
              <option value="newest">⏰ Date: Newest First</option>
              <option value="oldest">⏰ Date: Oldest First</option>
              <option value="exercises-count">🔥 Complexity: Most Drills</option>
              <option value="total-sets">⚡ Volume: Most Sets</option>
            </select>
          </div>

        </div>

      </div>

      {/* 3. LOG LISTINGS VIEW */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedHistory.length > 0 ? (
            filteredAndSortedHistory.map((log) => {
              const totalSets = log.exercises.reduce((sum, ex) => sum + ex.sets, 0);
              const isExpanded = expandedLogId === log.id;
              
              return (
                <motion.div
                  key={log.id}
                  id={`history-item-${log.id}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#111827]/40 border border-slate-800/80 rounded-2xl p-4 md:p-6 transition-all duration-300 hover:border-slate-700 relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    
                    {/* User Profile & Badge */}
                    <div className="flex items-center gap-3.5">
                      <div className="relative shrink-0">
                        <img 
                          src={log.userAvatar} 
                          alt={log.userName} 
                          className="w-11 h-11 rounded-full border border-slate-800 object-cover"
                        />
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-[#0d151c] rounded-full p-0.5 border border-[#111827] flex items-center justify-center">
                          <CircleCheck className="w-3.5 h-3.5 fill-[#0d151c]" />
                        </span>
                      </div>
                      
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-mono tracking-wider bg-slate-800 px-2.5 py-0.5 rounded-full text-slate-300 font-extrabold border border-slate-700/60">
                          {log.userName} Completed
                        </span>
                        <h4 className="text-base font-display font-extrabold text-white mt-1.5 truncate">
                          {log.workoutTitle}
                        </h4>
                      </div>
                    </div>

                    {/* Meta Spec Values right */}
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto md:justify-end text-xs font-semibold">
                      
                      {/* Workout type badge */}
                      <span className={`px-2.5 py-1 rounded-full font-mono text-[10px] uppercase font-bold text-center tracking-normal ${
                        log.workoutType.toLowerCase() === "calisthenics" 
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/60"
                          : log.workoutType.toLowerCase() === "powerlifting"
                          ? "bg-rose-950/40 text-rose-400 border border-rose-900/60"
                          : "bg-teal-950/40 text-teal-400 border border-teal-900/60"
                      }`}>
                        {log.workoutType}
                      </span>

                      {/* Sets & Drills counters */}
                      <span className="bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1 rounded-lg font-mono">
                        {log.exercises.length} Exercises ({totalSets} Sets)
                      </span>

                      {/* Time display */}
                      <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        {formatTimestamp(log.completedAt)}
                      </span>

                      {/* Direct Collapse trigger button */}
                      <button
                        onClick={() => toggleExpandLog(log.id)}
                        className="p-1 px-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white rounded-lg transition-colors flex items-center gap-1 shrink-0 text-slate-400 cursor-pointer text-xs"
                      >
                        {isExpanded ? (
                          <>
                            <span>Hide</span>
                            <ChevronUp className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>Show Drills</span>
                            <ChevronDown className="w-4 h-4 text-[#00FF95]" />
                          </>
                        )}
                      </button>

                    </div>

                  </div>

                  {/* Collapsed DRILL TABLE LISTING */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4 pt-4 border-t border-slate-800/80"
                      >
                        <p className="text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-3 font-semibold">
                          Exercise Reps Breakdown
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {log.exercises.map((drill, dIdx) => (
                            <div 
                              key={dIdx} 
                              className="px-4 py-3 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between"
                            >
                              <div className="flex items-center gap-2 max-w-[70%]">
                                <span className="text-[#00FF95] text-[11px] font-mono font-bold bg-[#00ff950a] min-w-[18px] h-4.5 rounded flex items-center justify-center shrink-0">
                                  {dIdx + 1}
                                </span>
                                <p className="text-xs text-slate-200 font-bold truncate">{drill.name}</p>
                              </div>
                              <div className="text-right flex items-center gap-2">
                                <span className="bg-slate-900 text-slate-400 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-800">
                                  {drill.sets} sets
                                </span>
                                <span className="bg-[#00ff9511] text-[#00FF95] font-mono text-[10px] px-2 py-0.5 rounded font-extrabold">
                                  {drill.reps}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              );
            })
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 border border-dashed border-slate-800 rounded-2xl bg-[#111827]/10"
            >
              <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-300 font-bold font-display">No workout sessions match active filters</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the query or logging a workout from the checklist!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
