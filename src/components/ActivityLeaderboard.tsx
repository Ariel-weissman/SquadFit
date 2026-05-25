import React, { useState } from "react";
import { Award, Flame, BellRing, ChevronUp, AlertTriangle, Sparkles, MessageSquare, ShieldAlert } from "lucide-react";
import { User, ActiveNudge } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ActivityLeaderboardProps {
  users: { [id: string]: User };
  currentUser: User;
  nudges: ActiveNudge[];
  onNudge: (targetUserId: string) => Promise<ActiveNudge | null>;
}

export default function ActivityLeaderboard({
  users,
  currentUser,
  nudges,
  onNudge
}: ActivityLeaderboardProps) {
  const [nudgingId, setNudgingId] = useState<string | null>(null);
  const [activeBubble, setActiveBubble] = useState<{ id: string; msg: string } | null>(null);

  // Rank users by completion rate
  const rankings = Object.values(users).sort((a, b) => {
    if (b.completionRate !== a.completionRate) {
      return b.completionRate - a.completionRate;
    }
    return b.streak - a.streak;
  });

  const handleNudgeClick = async (targetId: string) => {
    setNudgingId(targetId);
    try {
      const generated = await onNudge(targetId);
      if (generated) {
        setActiveBubble({ id: targetId, msg: generated.message });
        // Clear active bubble after 8 seconds
        setTimeout(() => {
          setActiveBubble(null);
        }, 8500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setNudgingId(null);
    }
  };

  return (
    <div id="leaderboard-root" className="bg-[#111827]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl relative">
      <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider font-mono">
            Social Ladder
          </span>
          <h2 className="text-xl font-display font-extrabold text-white mt-1.5 flex items-center gap-2">
            <Award className="text-amber-400 w-5 h-5" /> Squad Placement
          </h2>
        </div>
        <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
          <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="text-xs font-bold text-amber-400 font-mono">
            {rankings.reduce((acc, u) => Math.max(acc, u.streak), 0)} Day Top Streak
          </span>
        </div>
      </div>

      {/* Ranked Ladder */}
      <div className="space-y-3 mb-8">
        {rankings.map((user, idx) => {
          const isMe = user.id === currentUser.id;
          const isTop = idx === 0;
          const isSlacking = user.completionRate < 35;
          const isNudgingThisUser = nudgingId === user.id;
          const hasBubble = activeBubble?.id === user.id;

          return (
            <div
              key={user.id}
              id={`rank-row-${user.id}`}
              className={`relative flex flex-col p-4 rounded-xl border transition-all duration-300 ${
                isMe
                  ? "bg-slate-900/60 border-emerald-500/30 ring-1 ring-emerald-500/15"
                  : "bg-slate-900/30 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Placement Indicator */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isTop
                      ? "bg-amber-400 text-[#0c131a] shadow-lg shadow-amber-400/20"
                      : idx === 1
                      ? "bg-slate-300 text-slate-800"
                      : idx === 2
                      ? "bg-amber-700 text-amber-100"
                      : "bg-slate-800 text-slate-400"
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Avatar & Info */}
                  <div className="relative shrink-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-xl border border-slate-800 object-cover"
                    />
                    {user.streak > 0 && (
                      <div className="absolute -bottom-1 -right-1 bg-[#0a0f1d] border border-amber-500/30 text-amber-400 px-1 py-0.5 rounded-full flex items-center gap-0.5 scale-90">
                        <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                        <span className="text-[8px] font-bold font-mono">{user.streak}</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-semibold text-sm truncate ${isMe ? "text-emerald-400" : "text-white"}`}>
                        {user.name} {isMe && "(You)"}
                      </p>
                      {isSlacking && (
                        <span className="bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-0.5 shrink-0">
                          <ShieldAlert className="w-2.5 h-2.5" /> Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono">
                      Completed: <span className="text-slate-200">{user.workoutsCompleted}</span> / Target: {user.weeklyTarget}
                    </p>
                  </div>
                </div>

                {/* Score and Nudge Action */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-base font-extrabold text-white font-mono">
                      {user.completionRate}%
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Done</span>
                  </div>

                  {/* Nudge/Roast button if is another user and slacking */}
                  {!isMe && (
                    <button
                      id={`nudge-btn-${user.id}`}
                      onClick={() => handleNudgeClick(user.id)}
                      disabled={isNudgingThisUser}
                      className={`p-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        isSlacking
                          ? "bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-[#0c131a] border-rose-500/30 shadow-lg shadow-rose-500/5 animate-pulse"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/50"
                      }`}
                      title="Send Duolingo-style gym roast"
                    >
                      <BellRing className={`w-3.5 h-3.5 ${isNudgingThisUser ? "animate-spin" : ""}`} />
                      <span>{isSlacking ? "Roast & Nudge" : "Nudge"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Speech bubble for the specific user roast */}
              <AnimatePresence>
                {hasBubble && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl relative text-xs text-slate-300 leading-relaxed font-sans"
                  >
                    <div className="absolute top-0 right-8 -mt-2 w-4 h-4 bg-slate-900 border-t border-r border-slate-800 rotate-45" />
                    <div className="flex gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 mt-1 shrink-0" />
                      <div>
                        <span className="text-emerald-400 font-bold font-mono text-[9px] uppercase block mb-1">
                          🔥 CHAO_STRIKE MOTIVATIONAL ROAST:
                        </span>
                        <span>{activeBubble.msg}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Realtime Group Activity Feed logs */}
      <div>
        <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-3 border-t border-slate-800 pt-4 flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5" /> Party Activity Logger
        </h3>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {nudges.map((n) => {
            const sender = users[n.fromUser] || { name: "Coach" };
            const target = users[n.toUser] || { name: "Friend" };
            return (
              <div key={n.id} className="text-[11px] leading-tight p-2 bg-slate-950/40 rounded-lg border border-slate-900 flex items-start gap-2">
                <span className="text-slate-400 font-bold tracking-tight bg-slate-800 px-1 py-0.5 rounded font-mono shrink-0">
                  {sender.name}
                </span>
                <p className="text-slate-300">
                  nudged <span className="font-semibold text-rose-300">{target.name}</span>: "{n.message}"
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
