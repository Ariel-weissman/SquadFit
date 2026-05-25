import React, { useEffect, useState } from "react";
import { 
  Dumbbell, 
  Users, 
  Award, 
  Flame, 
  Skull, 
  Settings, 
  Maximize2, 
  RefreshCw, 
  Sparkles, 
  HelpCircle, 
  Info, 
  ChevronRight, 
  UserCheck, 
  Coins, 
  Target, 
  Sliders,
  AlertCircle,
  Clock,
  Send,
  Calendar,
  Trash2,
  Bell
} from "lucide-react";
import { PartyState, DayWorkout, User, ActiveNudge, PunishmentConfig, HistoryEntry, ReminderSettings } from "./types";
import WorkoutPlanner from "./components/WorkoutPlanner";
import ActivityLeaderboard from "./components/ActivityLeaderboard";
import WorkoutHistory from "./components/WorkoutHistory";
import ReminderScheduler from "./components/ReminderScheduler";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [partyState, setPartyState] = useState<PartyState | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "party" | "social" | "punishments" | "history" | "reminders">("dashboard");
  const [actingAsId, setActingAsId] = useState<string>("user-1"); // Ariel
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMess, setErrorMess] = useState<string>("");

  // Workout generator variables
  const [daysCount, setDaysCount] = useState<number>(3);
  const [workoutStyle, setWorkoutStyle] = useState<string>("calisthenics");
  const [fitnessGoals, setFitnessGoals] = useState<string>("overhead stability & handstand balance");
  const [limitationsText, setLimitationsText] = useState<string>("no heavy rack, parallettes & floor space only");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);

  // Punishment calculation response state
  const [punishmentOutcome, setPunishmentOutcome] = useState<any>(null);
  const [isCalcingPenalty, setIsCalcingPenalty] = useState<boolean>(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);

  // Load state on mount and when changing acting user
  useEffect(() => {
    fetchState();
  }, []);

  const fetchState = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/state");
      if (!response.ok) throw new Error("Could not retrieve squad state.");
      const data = await response.json();
      setPartyState(data);
      // Trigger calculation of current active model representation
      triggerPunishmentCalculation(data.punishmentConfig.model, data);
    } catch (err: any) {
      setErrorMess(err.message || "Network issue connecting to server.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerReset = async () => {
    if (!window.confirm("Are you sure you want to reset the party work plan, nudge history, and stats back to default?")) return;
    setIsLoading(true);
    try {
      const resp = await fetch("/api/state/reset", { method: "POST" });
      const res = await resp.json();
      if (res.status === "success") {
        setPartyState(res.data);
        triggerPunishmentCalculation(res.data.punishmentConfig.model, res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerClearAll = async () => {
    if (!window.confirm("Are you sure you want to completely clear out all exercise checklists, workout history log entries, streaks, and squad nudges to zero?")) return;
    setIsLoading(true);
    try {
      const resp = await fetch("/api/state/clear", { method: "POST" });
      const res = await resp.json();
      if (res.status === "success") {
        setPartyState(res.data);
        triggerPunishmentCalculation(res.data.punishmentConfig.model, res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerPunishmentCalculation = async (model: string, currentStateOverride?: PartyState) => {
    setIsCalcingPenalty(true);
    try {
      const resp = await fetch("/api/party/punishment/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settingOption: model })
      });
      const data = await resp.json();
      if (data.status === "success") {
        setPunishmentOutcome(data);
      }
    } catch (err) {
      console.error("Penalty calculator failure", err);
    } finally {
      setIsCalcingPenalty(false);
    }
  };

  const handleToggleExercise = async (exerciseId: string, completed: boolean) => {
    try {
      const resp = await fetch("/api/workout/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          userId: actingAsId,
          completed
        })
      });
      const data = await resp.json();
      if (data.status === "success") {
        setPartyState(data.data);
        // Refresh calculations to update penalty percentages live!
        if (partyState) {
          triggerPunishmentCalculation(partyState.punishmentConfig.model, data.data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualEdit = async (exerciseId: string, name: string, sets: number, reps: string, rest: string) => {
    try {
      const resp = await fetch("/api/workout/manual-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, name, sets, reps, rest })
      });
      const data = await resp.json();
      if (data.status === "success") {
        setPartyState(prev => prev ? { ...prev, activePlan: data.plan } : null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAIConversationalEdit = async (whisper: string) => {
    const resp = await fetch("/api/workout/conversational-edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whisperInput: whisper })
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new Error(data.error || "Conversational edit failed.");
    }
    if (data.status === "success") {
      setPartyState(prev => prev ? { ...prev, activePlan: data.plan } : null);
    }
  };

  const handleUpdateReminderSettings = async (newSettings: Partial<ReminderSettings>) => {
    try {
      const resp = await fetch("/api/reminders/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings)
      });
      const data = await resp.json();
      if (data.status === "success") {
        setPartyState(data.data);
      }
    } catch (e) {
      console.error("Failed saving reminder configs to remote server", e);
    }
  };

  const handleGenerateAISchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingPlan(true);
    try {
      const resp = await fetch("/api/workout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainingDays: daysCount,
          preferences: workoutStyle,
          specificGoals: fitnessGoals,
          limitations: limitationsText
        })
      });
      const data = await resp.json();
      if (data.status === "success" && data.plan) {
        setPartyState(prev => prev ? { ...prev, activePlan: data.plan } : null);
        setActiveTab("dashboard");
      } else {
        alert(data.error || "Custom training structure failed to draft.");
      }
    } catch (err: any) {
      alert(err.message || "Generation time-out. Make sure your Gemini API key is valid.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleNudgeFriend = async (targetUserId: string): Promise<ActiveNudge | null> => {
    try {
      const resp = await fetch("/api/party/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: actingAsId,
          toUserId: targetUserId
        })
      });
      const data = await resp.json();
      if (data.status === "success") {
        setPartyState(prev => prev ? { ...prev, nudges: data.allNudges } : null);
        return data.nudge;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const handleLogWorkoutToHistory = async (workoutTitle: string, workoutType: string, exercises: any[]) => {
    try {
      const resp = await fetch("/api/workout/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: actingAsId,
          workoutTitle,
          workoutType,
          exercises
        })
      });
      const data = await resp.json();
      if (data.status === "success" || data.data) {
        setPartyState(data.data);
        triggerPunishmentCalculation(data.data.punishmentConfig.model, data.data);
      }
    } catch (err) {
      console.error("Error logging workout to remote history registry", err);
    }
  };

  const handleConfigPunishment = async (model: string, amount: number, pool: string) => {
    try {
      const resp = await fetch("/api/party/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          flatRateAmount: amount,
          weeklyPayloadPool: pool
        })
      });
      const data = await resp.json();
      if (data.status === "success") {
        setPartyState(prev => {
          if (!prev) return null;
          return {
            ...prev,
            punishmentConfig: {
              ...prev.punishmentConfig,
              model: model as any,
              flatRateAmount: amount,
              weeklyPayloadPool: pool
            }
          };
        });
        triggerPunishmentCalculation(model);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading && !partyState) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center text-slate-300 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00FF95] border-t-transparent rounded-full animate-spin" />
          <p className="font-display font-extrabold text-[#00FF95] tracking-widest text-lg glow-text">SQUADFIT ENGINE</p>
          <span className="text-xs text-slate-500 font-mono">Loading real-time workout synchronization...</span>
        </div>
      </div>
    );
  }

  const currentUser = partyState?.users[actingAsId] || {
    id: "user-1",
    name: "Ariel",
    email: "arielweissmangemini@gmail.com",
    avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
    streak: 3,
    completionRate: 75,
    workoutsCompleted: 6,
    workoutsMissed: 2,
    weeklyTarget: 4,
    isSlacking: false
  };

  // Identify slacking members to create immediate awareness
  const slackingUsers = partyState ? (Object.values(partyState.users) as User[]).filter(u => u.isSlacking || u.completionRate < 35) : [];

  return (
    <div id="app-container" className="min-h-screen flex bg-[#0A0A0B] text-[#E0E0E0] font-sans pb-20 md:pb-0">
      
      {/* 1. SIDEBAR - STRICT ADHERENCE TO IMMERSIVE DESIGN THEME (Hidden on Mobile) */}
      <aside id="sidebar" className="hidden md:flex w-[240px] shrink-0 border-r border-[#ffffff14] bg-[#0f1012cc] flex-col p-6 justify-between self-stretch sticky top-0 h-screen overflow-y-auto">
        <div className="flex flex-col">
          {/* Neon Branded Logo */}
          <div className="logo mb-10 text-2xl font-black text-[#00FF95] tracking-tighter cursor-pointer flex items-center gap-2 select-none" onClick={fetchState}>
            <div className="w-3 h-3 bg-[#00FF95] rounded-full animate-ping mr-1" />
            <span className="glow-text tracking-widest uppercase font-display">SQUADFIT</span>
          </div>

          {/* Nav items */}
          <div className="space-y-1.5">
            <button
              id="nav-btn-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left ${
                activeTab === "dashboard"
                  ? "bg-[#00ff951a] text-[#00FF95] font-extrabold border-l-4 border-[#00FF95]"
                  : "text-[#888888] hover:text-[#00FF95] hover:bg-[#ffffff05]"
              }`}
            >
              <Dumbbell className="w-4.5 h-4.5" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-btn-party"
              onClick={() => setActiveTab("party")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left ${
                activeTab === "party"
                  ? "bg-[#00ff951a] text-[#00FF95] font-extrabold border-l-4 border-[#00FF95]"
                  : "text-[#888888] hover:text-[#00FF95] hover:bg-[#ffffff05]"
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              <span>Party Planner</span>
            </button>

            <button
              id="nav-btn-social"
              onClick={() => setActiveTab("social")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left ${
                activeTab === "social"
                  ? "bg-[#00ff951a] text-[#00FF95] font-extrabold border-l-4 border-[#00FF95]"
                  : "text-[#888888] hover:text-[#00FF95] hover:bg-[#ffffff05]"
              }`}
            >
              <Award className="w-4.5 h-4.5" />
              <span>Social Ladder</span>
            </button>

            <button
              id="nav-btn-punishments"
              onClick={() => setActiveTab("punishments")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left ${
                activeTab === "punishments"
                  ? "bg-[#00ff951a] text-[#00FF95] font-extrabold border-l-4 border-[#00FF95]"
                  : "text-[#888888] hover:text-[#00FF95] hover:bg-[#ffffff05]"
              }`}
            >
              <Skull className="w-4.5 h-4.5" />
              <span>Punishments</span>
            </button>

            <button
              id="nav-btn-history"
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left ${
                activeTab === "history"
                  ? "bg-[#00ff951a] text-[#00FF95] font-extrabold border-l-4 border-[#00FF95]"
                  : "text-[#888888] hover:text-[#00FF95] hover:bg-[#ffffff05]"
              }`}
            >
              <Calendar className="w-4.5 h-4.5" />
              <span>Workout History</span>
            </button>

            <button
              id="nav-btn-reminders"
              onClick={() => setActiveTab("reminders")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left ${
                activeTab === "reminders"
                  ? "bg-[#00ff951a] text-[#00FF95] font-extrabold border-l-4 border-[#00FF95]"
                  : "text-[#888888] hover:text-[#00FF95] hover:bg-[#ffffff05]"
              }`}
            >
              <Bell className="w-4.5 h-4.5" />
              <span>Reminders</span>
            </button>
          </div>
        </div>

        {/* ACTIVE PENALTY BOX - IMMERSIVE DESIGN HTML PRESET */}
        <div className="flex flex-col gap-3">
          {/* Active Penalty Display Card */}
          <div className="penalty-box bg-[#ff44441a] border border-[#ff44444d] p-4 rounded-xl flex flex-col gap-1.5">
            <div className="penalty-title text-[#FF4444] font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Active Squad Penalties
            </div>
            <div className="text-xs font-semibold text-rose-100 flex items-center justify-between gap-1">
              <span>{partyState?.punishmentConfig.weeklyPayloadPool || "400 burpees or $40"}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              Active configuration: <span className="text-rose-400 capitalize font-bold">{partyState?.punishmentConfig.model.replace('-', ' ')}</span>
            </div>
          </div>

          {/* Reset & Wipe debug options */}
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            <button
              id="reset-state-btn"
              onClick={triggerReset}
              className="text-[10px] uppercase font-mono text-slate-400 hover:text-slate-200 transition flex items-center gap-1 justify-center py-2 rounded bg-slate-900/40 border border-slate-900 cursor-pointer"
              title="Reset state with rich mock defaults"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Defaults
            </button>
            <button
              id="clear-all-data-btn"
              onClick={triggerClearAll}
              className="text-[10px] uppercase font-mono text-rose-400 hover:text-rose-200 transition flex items-center gap-1 justify-center py-2 rounded bg-rose-950/20 border border-rose-900/40 cursor-pointer font-bold animate-pulse"
              title="Completely wipe all checklists, history, and streaks to empty state"
            >
              <Trash2 className="w-2.5 h-2.5" /> Wipe All
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN HUB CONTENT CONTAINER */}
      <main id="main-content" className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* TOP BAR / NAVIGATION USER BADGE */}
        <header id="top-bar" className="border-b border-[#ffffff14] bg-[#0f101280] backdrop-blur-md px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-40">
          <div>
            <div className="flex items-center gap-2 md:hidden mb-1.5">
              <div className="w-2 h-2 bg-[#00FF95] rounded-full animate-ping" />
              <span className="glow-text tracking-widest uppercase font-display text-xs font-black text-[#00FF95]">SQUADFIT PORTAL</span>
            </div>
            <span className="font-mono text-[10px] sm:text-xs uppercase text-[#00FF95] tracking-widest flex items-center gap-1.5 bg-[#00ff9510] px-3 py-1 rounded-full border border-[#00ff9520] w-max">
              <Flame className="w-3.5 h-3.5 fill-[#00FF95] text-[#00FF95]" /> 
              {partyState?.name || "Omega-Core Calisthenics"}
            </span>
            <h1 className="text-lg sm:text-2xl font-display font-black text-white mt-1.5">
              {activeTab === "dashboard" && "The Daily Grind"}
              {activeTab === "party" && "AI Group Workout Generator"}
              {activeTab === "social" && "Leaderboard & Nudges"}
              {activeTab === "punishments" && "Social Punishment Matrix"}
              {activeTab === "history" && "Workout History Logs"}
              {activeTab === "reminders" && "Schedules & Alarms"}
            </h1>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Mobile Penalties & Admin Toggle */}
            <button
              id="sandbox-configs-toggle-btn"
              onClick={() => setIsSandboxOpen(true)}
              className="md:hidden bg-[#111827] border border-slate-800 hover:border-[#00FF95] text-slate-300 hover:text-white px-3 py-2 rounded-xl flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
              title="Show active penalties & reset actions"
            >
              <Sliders className="w-4 h-4 text-[#00FF95]" />
              <span className="font-semibold">Sandbox Tool</span>
            </button>

            {/* Multi-User Identity Tester Switcher - Incredible interactive touch! */}
            <div className="bg-slate-950/60 border border-slate-800/80 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[10px] uppercase">Test as user:</span>
              <select
                id="identity-stealer"
                value={actingAsId}
                onChange={(e) => setActingAsId(e.target.value)}
                className="bg-[#1c2230] text-slate-200 text-xs border border-slate-700/60 rounded px-2 py-1 outline-none font-semibold focus:border-[#00FF95]"
              >
                {partyState && (Object.values(partyState.users) as User[]).map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.completionRate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* User Badge container conforming to HTML blueprint */}
            <div className="user-badge bg-[#ffffff0d] px-4 py-2 rounded-full flex items-center gap-3 border border-[#ffffff1a]">
              <div className="streak-dot w-2 h-2 rounded-full bg-[#00FF95] shadow-[0_0_10px_#00FF95]" />
              <div className="text-right">
                <span className="text-[10px] block font-mono font-extrabold text-[#00FF95] uppercase tracking-wider">
                  {currentUser.streak} DAY STREAK
                </span>
                <span className="text-xs font-semibold text-slate-300 block">{currentUser.name}</span>
              </div>
              <img
                src={currentUser.avatar}
                alt="Me"
                className="w-8 h-8 rounded-full border border-slate-700 object-cover"
              />
            </div>
          </div>
        </header>

        {/* 3. CORE PANEL SELECTOR CONTENT */}
        <div className="p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto space-y-8">
          
          {/* SQUAD EMERGENCY PANEL ACCENTS - If any member is slacking */}
          {slackingUsers.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  <AlertCircle className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-slate-100 text-sm">Slackers Detected in Party</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {slackingUsers.map(u => u.name).join(", ")} {slackingUsers.length === 1 ? "is" : "are"} below 35% checklist completion! Go to the leaderboard to roast them.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("social")}
                className="text-xs font-bold text-[#00FF95] bg-[#00ff951a] hover:bg-[#00ff9533] px-3.5 py-1.5 rounded-xl transition-all self-start sm:self-auto shrink-0"
              >
                Send Roasts Now
              </button>
            </div>
          )}

          {errorMess && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>{errorMess}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD VIEW */}
          {activeTab === "dashboard" && partyState && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Checklist left */}
              <div className="lg:col-span-8 space-y-6">
                <WorkoutPlanner
                  activePlan={partyState.activePlan}
                  currentUser={currentUser as User}
                  users={partyState.users}
                  onToggleExercise={handleToggleExercise}
                  onManualEdit={handleManualEdit}
                  onAIConversationalEdit={handleAIConversationalEdit}
                  onLogWorkoutToHistory={handleLogWorkoutToHistory}
                />
              </div>

              {/* Mini visual summary right */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Gym motivation quote coach custom panel */}
                <div className="bg-[#111827]/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
                  <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-400" /> Dynamic Status
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-2xl font-black text-white font-mono block">
                        {Math.round((Object.values(partyState.users) as User[]).reduce((acc, curr) => acc + curr.completionRate, 0) / Object.keys(partyState.users).length)}%
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">Average Party Completion Rate</span>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-800">
                      <p className="text-xs font-semibold text-slate-300">Daily Tip / Goal:</p>
                      <p className="text-xs text-slate-400 leading-relaxed italic">
                        "Your muscles don't know the day of the week, they only know absolute tension. Finish your weekly {partyState.activePlan.length} workout days to stay off the burpee payload registry."
                      </p>
                    </div>

                    {/* Quick navigation shortcuts */}
                    <div className="grid grid-cols-2 gap-2 pt-4">
                      <button 
                        onClick={() => setActiveTab("party")}
                        className="bg-slate-800 hover:bg-slate-700/80 text-xs py-2 px-3 rounded-lg text-slate-300 text-center font-semibold border border-slate-700/40"
                      >
                        Adjust Goal Inputs
                      </button>
                      <button 
                        onClick={() => setActiveTab("punishments")}
                        className="bg-rose-950/30 hover:bg-rose-950/50 text-xs py-2 px-3 rounded-lg text-rose-300 text-center font-semibold border border-rose-900/40"
                      >
                        Penalty Splitter
                      </button>
                    </div>
                  </div>
                </div>

                {/* Micro Leaderboard */}
                <div className="bg-[#111827]/50 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-mono uppercase tracking-widest text-slate-400">Quick Rankings</h3>
                    <button onClick={() => setActiveTab("social")} className="text-xs text-[#00FF95] hover:underline">View all</button>
                  </div>
                  <div className="space-y-3">
                    {(Object.values(partyState.users) as User[])
                      .sort((a,b) => b.completionRate - a.completionRate)
                      .slice(0, 3)
                      .map((u, idx) => (
                        <div key={u.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/20 border border-slate-900">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-[#00FF95] font-bold">#{idx + 1}</span>
                            <img src={u.avatar} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-xs font-semibold text-slate-300 truncate">{u.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-200">{u.completionRate}%</span>
                        </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: PARTY PLANNING & GENERATOR (AI MODULE) */}
          {activeTab === "party" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Selection inputs Form */}
              <div className="lg:col-span-7 bg-[#111827]/50 border border-slate-800 rounded-2xl p-6 md:p-8 relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <h3 className="text-xl font-display font-extrabold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="text-[#00FF95] w-5 h-5" /> Generate Customized Party Plan
                </h3>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                  Enter your team's limitations, training days and visual target milestones. The AI gym partner compiles optimal checklists with sets, reps, and precise rest ranges.
                </p>

                <form onSubmit={handleGenerateAISchedule} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-bold">
                        Weekly Training Days
                      </label>
                      <select
                        id="days-count-select"
                        value={daysCount}
                        onChange={(e) => setDaysCount(Number(e.target.value))}
                        className="w-full bg-[#1c2230] border border-slate-700/80 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none focus:border-[#00FF95]"
                      >
                        <option value={2}>2 Days Split</option>
                        <option value={3}>3 Days Split (Recommended)</option>
                        <option value={4}>4 Days Split</option>
                        <option value={5}>5 Days Hardcore Split</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-bold">
                        Training Style / Focus
                      </label>
                      <select
                        id="training-style-select"
                        value={workoutStyle}
                        onChange={(e) => setWorkoutStyle(e.target.value)}
                        className="w-full bg-[#1c2230] border border-slate-700/80 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none focus:border-[#00FF95]"
                      >
                        <option value="calisthenics">Progressive Calisthenics (Bodyweight)</option>
                        <option value="powerlifting">Powerlifting (Strength / Heavy Barbell)</option>
                        <option value="functional strength">Functional Hypertrophy & Stability</option>
                        <option value="olympic lifting">Olympic Weight Lifting Foundations</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-bold">
                      Team Level & Specific Targets / Milestones
                    </label>
                    <input
                      type="text"
                      id="goals-text-input"
                      value={fitnessGoals}
                      onChange={(e) => setFitnessGoals(e.target.value)}
                      placeholder='e.g. "Mastering a handstand walk, solid core compression and explosive posture"'
                      className="w-full bg-[#1c2230] border border-slate-700/80 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none focus:border-[#00FF95]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5 font-bold">
                      Equipment limitations / Injury safeguards
                    </label>
                    <textarea
                      id="limitations-text-input"
                      value={limitationsText}
                      onChange={(e) => setLimitationsText(e.target.value)}
                      placeholder='e.g. "We only have gymnastics rings, dumbbells, pull-up bars and a plyo box. No squad squat racks."'
                      rows={3}
                      className="w-full bg-[#1c2230] border border-slate-700/80 rounded-xl px-4 py-2.5 text-slate-200 text-sm outline-none focus:border-[#00FF95] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    id="submit-gen-btn"
                    disabled={isGeneratingPlan}
                    className="w-full bg-[#00FF95] hover:bg-emerald-400 disabled:opacity-50 text-[#0d151c] py-3.5 px-6 rounded-xl font-bold transition-all shadow-lg hover:shadow-[#00FF95]/20 flex items-center justify-center gap-2"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <RefreshCw className="animate-spin w-5 h-5" />
                        Analyzing biomechanics & structuring split...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Compile Plan using Gemini AI
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Explanatory widget right */}
              <div className="lg:col-span-5 bg-[#111827]/30 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-display font-bold text-white mb-3">Active Squad Settings:</h3>
                  <div className="space-y-4">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900 flex items-start gap-2.5">
                      <Target className="w-4 h-4 text-[#00FF95] mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Party Goal</p>
                        <p className="text-xs text-slate-400 mt-0.5">Maintain consistent checklist accountability. Editing exercises triggers automatic active updates for all members.</p>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-900 flex items-start gap-2.5">
                      <Users className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-white">Live Syncing Enabled</p>
                        <p className="text-xs text-slate-400 mt-0.5">Toggling an exercise updates stats immediately. Missing checklist days increases the team punishment payload split.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-xs text-emerald-400/90 leading-relaxed">
                    <span className="font-bold">Prompt Sandbox Highlight:</span> Gemini writes a formatted JSON routine that translates into standard checklists automatically.
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Squad ID: {partyState?.id}</span>
                  <span>4 members online</span>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: SOCIAL FEED & LEADERBOARD */}
          {activeTab === "social" && partyState && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8">
                <ActivityLeaderboard
                  users={partyState.users}
                  currentUser={currentUser as User}
                  nudges={partyState.nudges}
                  onNudge={handleNudgeFriend}
                />
              </div>

              <div className="lg:col-span-4 bg-[#111827]/40 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
                <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-widest flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amber-500 animate-bounce" /> Hot Gym Streaks
                </h3>
                <p className="text-slate-400">
                  A streak increases each time the user maintains 80% or greater workout checklist completions. Slacking markers trigger automatically when completions drop under 35%.
                </p>

                <div className="space-y-3 pt-3">
                  {(Object.values(partyState.users) as User[]).map(u => {
                    const pctOfStreak = Math.min(100, Math.max(10, (u.streak / 15) * 100));
                    return (
                      <div key={u.id} className="space-y-1 bg-slate-950/30 p-2.5 rounded-xl border border-slate-900">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-300">{u.name}</span>
                          <span className="font-mono text-[#00FF95] font-bold">{u.streak} 🔥</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-amber-500 to-[#00FF95] h-full rounded-full transition-all duration-500"
                            style={{ width: `${pctOfStreak}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PUNISHMENT RULES CONFIG AND CALCS (DUMMY PAYLOAD SYSTEM) */}
          {activeTab === "punishments" && partyState && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Rule Form config left */}
                <div className="lg:col-span-5 bg-[#111827]/40 border border-slate-800 rounded-2xl p-6 space-y-6">
                  <div>
                    <span className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold tracking-widest block w-fit mb-2 uppercase">
                      Social Accountability Rules
                    </span>
                    <h3 className="text-lg font-display font-black text-white">Configure Penalty Metrics</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Choose which models scale the penance payload. Changes update immediately for live calculations.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2">
                    {/* Model Select Radio Group */}
                    <div className="space-y-3">
                      <label className="text-xs font-mono text-slate-300 uppercase tracking-wider block font-bold">Penalty Scale Metric</label>
                      
                      {[
                        {
                          id: "scaled-percentage",
                          title: "Weekly Scaled Percentage Split",
                          desc: "Calculate total misses across the team and divide the payload percentage-wise based on who was the absolute slacker."
                        },
                        {
                          id: "flat-rate",
                          title: "Per-Workout Flat Rate System",
                          desc: "Charge a flat rate amount (e.g. $10) for every missed scheduled session. Directly calculated live."
                        },
                        {
                          id: "workout-geared",
                          title: "Workout-Geared Penalty Rituals",
                          desc: "Synthesize extreme penalty bodyweight drills custom-themed around whichever workout focus areas were neglected."
                        }
                      ].map((m) => {
                        const checked = partyState.punishmentConfig.model === m.id;
                        return (
                          <div 
                            key={m.id}
                            id={`option-${m.id}`}
                            onClick={() => handleConfigPunishment(m.id, partyState.punishmentConfig.flatRateAmount, partyState.punishmentConfig.weeklyPayloadPool)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              checked 
                                ? "bg-rose-950/15 border-rose-500/40" 
                                : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-805"
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={`w-4.5 h-4.5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                                checked ? "border-rose-500 text-rose-500" : "border-slate-600"
                              }`}>
                                {checked && <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />}
                              </div>
                              <div>
                                <p className={`text-xs font-bold ${checked ? "text-rose-400" : "text-slate-200"}`}>{m.title}</p>
                                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Additional fields depending on selection */}
                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <div>
                        <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">Weekly Penalty Pool Payload text</label>
                        <input
                          type="text"
                          id="weekly-pool-field"
                          value={partyState.punishmentConfig.weeklyPayloadPool}
                          onChange={(e) => handleConfigPunishment(partyState.punishmentConfig.model, partyState.punishmentConfig.flatRateAmount, e.target.value)}
                          placeholder="e.g., 400 Penalty burpees total or $40 Pizza Fund"
                          className="w-full bg-[#1c2230] border border-slate-705 border-slate-800 focus:border-rose-500 rounded-lg px-3 py-2 text-[#E0E0E0] text-xs outline-none"
                        />
                      </div>

                      {partyState.punishmentConfig.model === "flat-rate" && (
                        <div>
                          <label className="block text-[11px] font-mono uppercase text-[#E0E0E0] mb-1.5">Flat rate per workout missed ($)</label>
                          <input
                            type="number"
                            id="flat-rate-field"
                            value={partyState.punishmentConfig.flatRateAmount}
                            onChange={(e) => handleConfigPunishment(partyState.punishmentConfig.model, Number(e.target.value), partyState.punishmentConfig.weeklyPayloadPool)}
                            className="w-full bg-[#1c2230] border border-slate-800 focus:border-rose-500 rounded-lg px-3 py-2 text-white text-xs outline-none"
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Calculation view right - Bento Splitter Grid */}
                <div className="lg:col-span-7 bg-[#111827]/35 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-lg font-display font-extrabold text-white">Accountability Solver Output</h3>
                      <p className="text-xs text-slate-400">Live breakdown calculated relative to checking boxes</p>
                    </div>
                    <button
                      id="refresh-penalty-btn"
                      onClick={() => triggerPunishmentCalculation(partyState.punishmentConfig.model)}
                      className="px-3 py-1 bg-slate-900 border border-slate-700/60 rounded-lg text-xs hover:text-white transition flex items-center gap-1 text-slate-300"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCalcingPenalty ? "animate-spin" : ""}`} /> Refresh Solves
                    </button>
                  </div>

                  {punishmentOutcome ? (
                    <div className="space-y-6">
                      
                      {/* CASE A: SCALED PERCENTAGE MODEL VIEW */}
                      {partyState.punishmentConfig.model === "scaled-percentage" && (
                        <div className="space-y-4">
                          <p className="text-xs text-[#E0E0E0] font-mono uppercase tracking-widest block bg-rose-500/10 w-fit px-2 py-0.5 rounded text-rose-400">
                            Payload Split Allocation (Percentage Mode)
                          </p>
                          <div className="space-y-4">
                            {punishmentOutcome.scaledSplit && punishmentOutcome.scaledSplit.map((s: any) => (
                              <div key={s.userId} className="space-y-2 bg-slate-950/20 p-3 rounded-xl border border-slate-900">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full border border-slate-800 object-cover" />
                                    <div>
                                      <p className="text-xs font-bold text-white">{s.name}</p>
                                      <p className="text-[10px] text-slate-400">Misses: <span className="font-mono text-rose-300">{s.missedCount}</span> workouts</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-mono text-xs font-extrabold text-rose-400 block">{s.scaledPercentage}%</span>
                                    <span className="text-[9px] text-slate-500 uppercase font-mono">{s.penaltyShare}</span>
                                  </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full"
                                    style={{ width: `${s.scaledPercentage}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CASE B: FLAT RATE MODEL VIEW */}
                      {partyState.punishmentConfig.model === "flat-rate" && (
                        <div className="space-y-4">
                          <p className="text-xs text-[#E0E0E0] font-mono uppercase tracking-widest block bg-rose-500/10 w-fit px-2 py-0.5 rounded text-rose-400">
                            Flat Rate Penalties Due
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {punishmentOutcome.flatRates && punishmentOutcome.flatRates.map((f: any) => (
                              <div key={f.userId} className="bg-slate-950/20 p-4 rounded-xl border border-slate-900 flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-200 truncate">{f.name}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{f.missed} miss day points × ${partyState.punishmentConfig.flatRateAmount}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-mono text-base font-black text-rose-400 block">{f.formattedFee}</span>
                                  <span className="text-[8px] tracking-wider text-slate-500 uppercase block">Owed to Pool</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* CASE C: WORKOUT-GEARED PENANCE PLAN */}
                      {partyState.punishmentConfig.model === "workout-geared" && (
                        <div className="space-y-4">
                          <div className="bg-rose-950/20 border border-rose-500/20 p-4 rounded-xl">
                            <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                              <Skull className="w-3.5 h-3.5" /> Customized Squad Penalty Drill Card
                            </h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Because we missed workout checkboxes this week, the AI Coach generated these penalty drills targeting neglected muscle zones. Must complete by tonight:
                            </p>
                          </div>

                          <div className="space-y-3">
                            {punishmentOutcome.workoutGearedExercises && punishmentOutcome.workoutGearedExercises.map((exText: string, idx: number) => {
                              return (
                                <div key={idx} className="bg-[#18111b] border border-rose-900/30 p-3 rounded-lg flex items-start gap-2 text-xs">
                                  <span className="text-rose-400 font-bold font-mono text-[10px] bg-rose-950/50 min-w-[18px] h-[18px] rounded flex items-center justify-center shrink-0">
                                    P{idx + 1}
                                  </span>
                                  <p className="text-slate-200 font-sans leading-relaxed">{exText}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-xl">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      <p>Waiting to compile accounting statistics...</p>
                    </div>
                  )}

                  <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl flex items-start gap-2 text-slate-400 text-[11px] leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 text-[#00FF95]" />
                    <span>
                      <strong>Accountability Sandbox Note:</strong> You can switch user identities using the select box in the top-right to check off tasks as other people. Watch how the percentage allocation shifts in real-time above!
                    </span>
                  </div>

                </div>

              </div>
            </div>
          )}

          {/* TAB 5: SQUAD WORKOUT HISTORY LOGGER */}
          {activeTab === "history" && partyState && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-display font-black text-white flex items-center gap-2">
                    <Calendar className="text-[#00FF95] w-6 h-6" /> Workout Log Wall
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Check complete historical exercises, filter metrics, and audit consistency
                  </p>
                </div>
              </div>
              <WorkoutHistory
                history={partyState.history || []}
                users={partyState.users}
                currentUser={currentUser as User}
              />
            </div>
          )}

          {/* TAB 6: NOTIFICATION REMINDERS */}
          {activeTab === "reminders" && partyState && (
            <div className="space-y-6">
              <ReminderScheduler
                reminderSettings={partyState.reminderSettings}
                users={partyState.users}
                currentUser={currentUser as User}
                onUpdateSettings={handleUpdateReminderSettings}
              />
            </div>
          )}

        </div>

        {/* FOOTER IMMERSIVE DECORATOR LINE */}
        <footer className="border-t border-[#ffffff14] bg-[#0c131a] px-8 py-4 flex items-center justify-between text-xs text-slate-500 mt-auto">
          <span>SquadFit Client v1.2</span>
          <span className="text-[10px] font-mono uppercase bg-[#1a2333] px-2.5 py-1 text-slate-400 rounded">
            Authorized session: arielweissmangemini@gmail.com
          </span>
        </footer>

      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION TAB BAR */}
      <nav id="mobile-bottom-nav" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c131ae0] backdrop-blur-md border-t border-[#ffffff14] px-1 py-1.5 flex items-center justify-around shadow-2xl pb-safe-bottom">
        <button
          id="mobile-nav-dashboard"
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1.5 flex-1 py-1 transition-all outline-none cursor-pointer ${
            activeTab === "dashboard" ? "text-[#00FF95] scale-105" : "text-slate-500"
          }`}
        >
          <Dumbbell className="w-5 h-5" />
          <span className="text-[9px] font-mono tracking-tighter uppercase font-extrabold">Checklist</span>
        </button>
        <button
          id="mobile-nav-party"
          onClick={() => setActiveTab("party")}
          className={`flex flex-col items-center gap-1.5 flex-1 py-1 transition-all outline-none cursor-pointer ${
            activeTab === "party" ? "text-[#00FF95] scale-105" : "text-slate-500"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-mono tracking-tighter uppercase font-extrabold">AI Plan</span>
        </button>
        <button
          id="mobile-nav-social"
          onClick={() => setActiveTab("social")}
          className={`flex flex-col items-center gap-1.5 flex-1 py-1 transition-all outline-none cursor-pointer ${
            activeTab === "social" ? "text-[#00FF95] scale-105" : "text-slate-500"
          }`}
        >
          <Award className="w-5 h-5" />
          <span className="text-[9px] font-mono tracking-tighter uppercase font-extrabold">Ladder</span>
        </button>
        <button
          id="mobile-nav-punishments"
          onClick={() => setActiveTab("punishments")}
          className={`flex flex-col items-center gap-1.5 flex-1 py-1 transition-all outline-none cursor-pointer ${
            activeTab === "punishments" ? "text-[#00FF95] scale-105" : "text-slate-500"
          }`}
        >
          <Skull className="w-5 h-5" />
          <span className="text-[9px] font-mono tracking-tighter uppercase font-extrabold">Penalties</span>
        </button>
        <button
          id="mobile-nav-history"
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center gap-1.5 flex-1 py-1 transition-all outline-none cursor-pointer ${
            activeTab === "history" ? "text-[#00FF95] scale-105" : "text-slate-500"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] font-mono tracking-tighter uppercase font-extrabold">History</span>
        </button>
        <button
          id="mobile-nav-reminders"
          onClick={() => setActiveTab("reminders")}
          className={`flex flex-col items-center gap-1.5 flex-1 py-1 transition-all outline-none cursor-pointer ${
            activeTab === "reminders" ? "text-[#00FF95] scale-105" : "text-slate-500"
          }`}
        >
          <Bell className="w-5 h-5" />
          <span className="text-[9px] font-mono tracking-tighter uppercase font-extrabold">Alarms</span>
        </button>
      </nav>

      {/* 4. RESPONSIVE MOBILE SANDBOX TOOL MODAL */}
      <AnimatePresence>
        {isSandboxOpen && (
          <div id="mobile-sandbox-overlay" className="fixed inset-0 bg-[#020617]/90 backdrop-blur-md flex items-center justify-center p-4 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0f1012] border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <h3 className="text-lg font-display font-extrabold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#00FF95]" /> Sandbox Tools
                </h3>
                <button
                  onClick={() => setIsSandboxOpen(false)}
                  className="text-slate-450 hover:text-white font-semibold text-xs bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700/60 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                {/* Active Penalties Display */}
                <div className="bg-[#ff44441a] border border-[#ff44444d] p-4 rounded-xl flex flex-col gap-1.5">
                  <div className="text-[#FF4444] font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    Active Squad Penalties
                  </div>
                  <div className="text-xs font-semibold text-rose-100 leading-normal">
                    {partyState?.punishmentConfig.weeklyPayloadPool || "400 burpees or $40 group penalty"}
                  </div>
                  <div className="text-[10px] text-slate-450 font-mono mt-1">
                    Active configuration: <span className="text-rose-400 capitalize font-bold">{partyState?.punishmentConfig.model.replace('-', ' ')}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-xs text-slate-400 leading-relaxed mb-4 font-medium">Clear out the active training schedule structure or restore rich presets instantly for easier testing.</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="mobile-reset-state-btn"
                      onClick={() => {
                        setIsSandboxOpen(false);
                        triggerReset();
                      }}
                      className="text-xs uppercase font-mono text-slate-300 hover:text-white transition flex items-center gap-1.5 justify-center py-3 rounded-xl bg-slate-900 border border-slate-850 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Defaults
                    </button>
                    <button
                      id="mobile-clear-all-data-btn"
                      onClick={async () => {
                        setIsSandboxOpen(false);
                        await triggerClearAll();
                      }}
                      className="text-xs uppercase font-mono text-rose-400 hover:text-rose-200 transition flex items-center gap-1.5 justify-center py-3 rounded-xl bg-rose-950/20 border border-rose-900/40 cursor-pointer font-bold animate-pulse"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Wipe All
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
