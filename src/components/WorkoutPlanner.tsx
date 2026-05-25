import React, { useState } from "react";
import { Dumbbell, Sparkles, Edit2, Check, RefreshCw, AlertCircle, PlayCircle, HelpCircle } from "lucide-react";
import { DayWorkout, Exercise, User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface WorkoutPlannerProps {
  activePlan: DayWorkout[];
  currentUser: User;
  users: { [id: string]: User };
  onToggleExercise: (exerciseId: string, completed: boolean) => void;
  onManualEdit: (exerciseId: string, name: string, sets: number, reps: string, rest: string) => Promise<void>;
  onAIConversationalEdit: (whisper: string) => Promise<void>;
  onLogWorkoutToHistory?: (workoutTitle: string, workoutType: string, exercises: any[]) => Promise<void>;
}

export default function WorkoutPlanner({
  activePlan,
  currentUser,
  users,
  onToggleExercise,
  onManualEdit,
  onAIConversationalEdit,
  onLogWorkoutToHistory
}: WorkoutPlannerProps) {
  const [activeDayIdx, setActiveDayIdx] = useState<number>(0);
  const [whisperText, setWhisperText] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>("");
  const [isLoggingProgress, setIsLoggingProgress] = useState<boolean>(false);
  const [logSuccessInfo, setLogSuccessInfo] = useState<string>("");
  
  // Manual edit state
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editSets, setEditSets] = useState<number>(3);
  const [editReps, setEditReps] = useState<string>("");
  const [editRest, setEditRest] = useState<string>("");

  const currentDay = activePlan[activeDayIdx] || null;

  const handleWhisperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whisperText.trim()) return;
    setIsAiLoading(true);
    setAiError("");
    try {
      await onAIConversationalEdit(whisperText);
      setWhisperText("");
    } catch (err: any) {
      setAiError(err.message || "Conversational edit failed. Try again.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const startEdit = (ex: Exercise) => {
    setEditingExercise(ex);
    setEditName(ex.name);
    setEditSets(ex.sets);
    setEditReps(ex.reps);
    setEditRest(ex.rest);
  };

  const saveManualEdit = async () => {
    if (!editingExercise) return;
    try {
      await onManualEdit(editingExercise.id, editName, editSets, editReps, editRest);
      setEditingExercise(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogToHistoryClick = async () => {
    if (!currentDay) return;
    
    // Find all checked exercises
    const checkedExercises = currentDay.exercises.filter(ex => !!ex.completedBy[currentUser.id]);
    
    // Default to logging all exercises if nothing is checked to ease testing
    const exercisesToLog = checkedExercises.length > 0 
      ? checkedExercises 
      : currentDay.exercises;

    setIsLoggingProgress(true);
    setLogSuccessInfo("");
    try {
      if (onLogWorkoutToHistory) {
        let type = "Calisthenics";
        const fLower = currentDay.focus.toLowerCase();
        if (fLower.includes("powerlifting") || fLower.includes("squat") || fLower.includes("barbell") || fLower.includes("heavy")) {
          type = "Powerlifting";
        } else if (fLower.includes("functional") || fLower.includes("stability") || fLower.includes("posture")) {
          type = "Functional Strength";
        }

        await onLogWorkoutToHistory(
          `${currentDay.dayName} - ${currentDay.focus.split(":")[0]}`,
          type,
          exercisesToLog.map(ex => ({
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps
          }))
        );
        
        setLogSuccessInfo(`Logged ${exercisesToLog.length} exercises to squad history log!`);
        setTimeout(() => setLogSuccessInfo(""), 5000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingProgress(false);
    }
  };

  return (
    <div id="workout-planner-root" className="bg-[#111827]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
              Active Routine
            </span>
            <span className="text-xs text-slate-400 font-mono">Synced Live</span>
          </div>
          <h2 className="text-2xl font-display font-extrabold text-white flex items-center gap-2">
            <Dumbbell className="text-emerald-400 w-6 h-6" /> Daily Checklist
          </h2>
        </div>

        {/* Day selection tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
          {activePlan.map((day, idx) => {
            const isSelected = activeDayIdx === idx;
            return (
              <button
                key={idx}
                id={`day-tab-${idx}`}
                onClick={() => setActiveDayIdx(idx)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  isSelected
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-[#0d151c] shadow-lg shadow-emerald-500/20 scale-105"
                    : "bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50"
                }`}
              >
                {day.dayName.split(" ")[0] || `Day ${idx + 1}`}
              </button>
            );
          })}
        </div>
      </div>

      {currentDay && (
        <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800/80">
          <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">Today's Focus</p>
          <p className="text-lg font-display font-bold text-white mt-1 text-emerald-300 drop-shadow-sm">
            {currentDay.focus}
          </p>
        </div>
      )}

      {/* Exercises List */}
      <div className="space-y-3 mb-6">
        {currentDay && currentDay.exercises.length > 0 ? (
          currentDay.exercises.map((ex) => {
            const isCompleted = !!ex.completedBy[currentUser.id];
            
            // Calculate party-wide completions ratio
            const partyCompleted = Object.keys(users).filter(uid => ex.completedBy[uid]).length;
            const totalMembers = Object.keys(users).length;

            return (
              <motion.div
                key={ex.id}
                id={`exercise-card-${ex.id}`}
                layoutId={`card-${ex.id}`}
                className={`group border rounded-xl p-4 transition-all duration-300 relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isCompleted
                    ? "bg-slate-900/40 border-emerald-900/50 opacity-85"
                    : "bg-[#1f2937]/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  {/* Real-time checklist checkbox */}
                  <button
                    id={`checkbox-${ex.id}`}
                    onClick={() => onToggleExercise(ex.id, !isCompleted)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 flex-shrink-0 mt-0.5 transition-all duration-300 ${
                      isCompleted
                        ? "bg-emerald-500 border-emerald-500 text-[#0d151c]"
                        : "border-slate-600 hover:border-emerald-400 bg-slate-800"
                    }`}
                  >
                    {isCompleted && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold tracking-tight truncate transition-colors ${
                      isCompleted ? "text-slate-400 line-through" : "text-white"
                    }`}>
                      {ex.name}
                    </p>
                    {/* Exercise Spec Tags */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="bg-slate-800 border border-slate-700/60 font-mono text-[10px] text-slate-300 px-2 py-0.5 rounded-md">
                        {ex.sets} Sets
                      </span>
                      <span className="bg-slate-800 border border-slate-700/60 font-mono text-[10px] text-slate-300 px-2 py-0.5 rounded-md">
                        {ex.reps} Reps
                      </span>
                      <span className="bg-slate-800 border border-slate-700/60 font-mono text-[10px] text-teal-400 px-2 py-0.5 rounded-md">
                        ⏱️ {ex.rest} Rest
                      </span>
                    </div>

                    {/* Shared state indicators */}
                    <div className="flex items-center gap-1.5 mt-2 text-slate-400 text-xs">
                      <span className="font-semibold text-emerald-400">{partyCompleted} / {totalMembers}</span>
                      <span>completed in this party</span>
                      {/* Avatars tiny list */}
                      <div className="flex -space-x-1.5 ml-1">
                        {Object.keys(users).map((uid) => {
                          if (ex.completedBy[uid]) {
                            return (
                              <img
                                key={uid}
                                src={users[uid].avatar}
                                alt={users[uid].name}
                                title={`${users[uid].name} completed`}
                                className="w-5 h-5 rounded-full border border-slate-900 object-cover"
                              />
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button
                    id={`edit-btn-${ex.id}`}
                    onClick={() => startEdit(ex)}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/40 text-slate-300 hover:text-white transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-400 border border-dashed border-slate-800 rounded-xl">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="font-medium text-slate-300">No workout exercises generated</p>
            <p className="text-xs text-slate-500 mt-1">Submit your party preferences to design a training routine!</p>
          </div>
        )}
      </div>

      {/* Real-time accountability logger widget */}
      {currentDay && currentDay.exercises.length > 0 && (
        <div className="mb-6 p-4 bg-[#00ff950a] border border-[#00ff9524] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left w-full sm:w-auto">
            <p className="text-xs font-mono uppercase tracking-widest text-[#00FF95] font-extrabold">Accountability Logger</p>
            <p className="text-sm font-bold text-slate-100 mt-1">Finish up and commit today's drills?</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Logs {currentDay.exercises.filter(ex => !!ex.completedBy[currentUser.id]).length} checked-off drills. If none checked, logs all {currentDay.exercises.length} as trial.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
            {logSuccessInfo && (
              <span className="text-xs font-mono text-[#00FF95] text-right bg-emerald-950/20 py-1.5 px-3 rounded-lg border border-emerald-950">
                {logSuccessInfo}
              </span>
            )}
            <button
              id="log-workout-submission-btn"
              onClick={handleLogToHistoryClick}
              disabled={isLoggingProgress}
              className="bg-[#00FF95] hover:bg-emerald-400 disabled:opacity-50 text-[#0d151c] font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md shadow-[#00ff951a] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              {isLoggingProgress ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Log Workout Session
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* AI Conversational Whisper Panel */}
      <div className="mt-8 border-t border-slate-800 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
          <h3 className="font-display font-bold text-white text-base">Conversational Assistant Mode</h3>
          <span className="bg-slate-800 border border-slate-700/60 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">
            Powered by Gemini
          </span>
        </div>

        <form onSubmit={handleWhisperSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            id="ai-coach-input"
            value={whisperText}
            onChange={(e) => setWhisperText(e.target.value)}
            placeholder='e.g., "Sam hurt his shoulder today, swap out overhead push-ups for low-impact core!"'
            className="flex-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition-colors"
            disabled={isAiLoading}
          />
          <button
            type="submit"
            id="ai-coach-submit"
            disabled={isAiLoading || !whisperText.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0d151c] font-bold text-sm px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {isAiLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Adjust Program
          </button>
        </form>
        {aiError && (
          <p className="text-rose-400 text-xs mt-2 flex items-center gap-1 font-semibold">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {aiError}
          </p>
        )}
        <div className="flex gap-1.5 flex-wrap mt-3">
          <span className="text-xs text-slate-400">Suggestions:</span>
          {["\"injury-safe core swap\"", "\"increase all reps by 2\"", "\"add handstand hold drill\""].map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setWhisperText(s.replace(/^"|"$/g, ''))}
              className="text-xs text-slate-300 hover:text-white bg-slate-800 border border-slate-700/40 px-2 py-0.5 rounded-md hover:bg-slate-700 transition"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Manual inline Overlay Edit Popup */}
      <AnimatePresence>
        {editingExercise && (
          <div id="manual-edit-modal" className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
              <h3 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" /> Manual Exercise Edit
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Exercise Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white text-sm outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Sets</label>
                    <input
                      type="number"
                      value={editSets}
                      onChange={(e) => setEditSets(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Reps Info</label>
                    <input
                      type="text"
                      value={editReps}
                      onChange={(e) => setEditReps(e.target.value)}
                      placeholder="e.g. 10-12"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Rest Duration</label>
                    <input
                      type="text"
                      value={editRest}
                      onChange={(e) => setEditRest(e.target.value)}
                      placeholder="e.g. 90s"
                      className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-white text-sm outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-800 justify-end">
                  <button
                    onClick={() => setEditingExercise(null)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveManualEdit}
                    className="px-5 py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-[#0d151c] rounded-xl transition"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
