import React, { useState } from "react";
import { 
  Bell, 
  Clock, 
  MessageSquare, 
  Smartphone, 
  Sparkles, 
  Play, 
  Save, 
  CheckCircle, 
  CornerDownRight, 
  Volume2, 
  ShieldAlert,
  Moon,
  Sun,
  Coffee
} from "lucide-react";
import { ReminderSettings, User } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface ReminderSchedulerProps {
  reminderSettings: ReminderSettings;
  users: { [id: string]: User };
  currentUser: User;
  onUpdateSettings: (newSettings: Partial<ReminderSettings>) => Promise<void>;
}

export default function ReminderScheduler({
  reminderSettings,
  users,
  currentUser,
  onUpdateSettings
}: ReminderSchedulerProps) {
  const [morningEnabled, setMorningEnabled] = useState(reminderSettings.morningEnabled);
  const [morningTime, setMorningTime] = useState(reminderSettings.morningTime);
  const [midDayEnabled, setMidDayEnabled] = useState(reminderSettings.midDayEnabled);
  const [midDayTime, setMidDayTime] = useState(reminderSettings.midDayTime);
  const [nightEnabled, setNightEnabled] = useState(reminderSettings.nightEnabled);
  const [nightTime, setNightTime] = useState(reminderSettings.nightTime);
  const [customTemplate, setCustomTemplate] = useState(
    reminderSettings.customMessageTemplate ||
    "🚨 {USER}, lock in your training! Today's squad focus is {FOCUS}. Complete `{EXERCISE}` to protect your streak of {STREAK} days!"
  );

  const [testUser, setTestUser] = useState<string>(currentUser.id);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null); // 'morning' | 'midday' | 'night'
  
  // Custom interactive mock phone screen notification preview state
  const [mockNotification, setMockNotification] = useState<{
    title: string;
    message: string;
    timeOfDay: string;
  } | null>({
    title: "🌅 Morning Reminder",
    message: `Rise and grind, ${currentUser.name}! Chloe is already crushing today's calisthenics. Complete your first exercise now!`,
    timeOfDay: "morning"
  });

  const [nativePermissionGranted, setNativePermissionGranted] = useState<boolean>(
    typeof window !== "undefined" && "Notification" in window && window.Notification.permission === "granted"
  );

  const requestNativeNotificationPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const permission = await window.Notification.requestPermission();
      setNativePermissionGranted(permission === "granted");
    } catch (e) {
      console.error("Failed requesting native permissions in iframe context", e);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateSettings({
        morningEnabled,
        morningTime,
        midDayEnabled,
        midDayTime,
        nightEnabled,
        nightTime,
        customMessageTemplate: customTemplate
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerTestReminders = async (timeOfDay: "morning" | "midday" | "night") => {
    setIsTesting(timeOfDay);
    try {
      const resp = await fetch("/api/reminders/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: testUser, timeOfDay })
      });
      const data = await resp.json();
      if (data.status === "success" || data.message) {
        setMockNotification({
          title: data.title,
          message: data.message,
          timeOfDay
        });

        // Trigger real native HTML5 Notification if permitted!
        if ("Notification" in window && window.Notification.permission === "granted") {
          new window.Notification(data.title, {
            body: data.message,
            icon: data.userAvatar || "/favicon.ico"
          });
        }
      }
    } catch (e) {
      console.error("Failed triggering live reminder tests on Sandbox Server", e);
    } finally {
      setIsTesting(null);
    }
  };

  return (
    <div id="reminder-scheduler-root" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* LEFT: SETTINGS CONFIGURATION ENGINE */}
      <div className="lg:col-span-7 bg-[#111827]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden">
        
        {/* Decorative ambient gradients */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00FF95]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-display font-black text-white">Daily Reminder Remotes</h3>
            <p className="text-xs text-slate-400">Schedule automatic alarm notification reminders on the day of workouts</p>
          </div>
        </div>

        {/* NATIVE PERMISSION ACCENT */}
        {!nativePermissionGranted && (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-indigo-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-200">Request Browser Toast Push Notifications</p>
                <p className="text-[10px] text-slate-450 mt-0.5">Enable real notifications on your desktop whenever reminders fire!</p>
              </div>
            </div>
            <button
              onClick={requestNativeNotificationPermission}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] uppercase font-bold py-1.5 px-3 rounded-lg border border-indigo-500/40 transition-colors cursor-pointer"
            >
              Enable Desktop
            </button>
          </div>
        )}

        {/* TIME TIMESLOT EDITORS */}
        <div className="space-y-4 pt-2">
          
          {/* 1. MORNING ALERT */}
          <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between gap-4 transition-all hover:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border ${
                morningEnabled 
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20" 
                  : "bg-slate-900 text-slate-550 border-slate-850"
              }`}>
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Morning Rise & Grind</span>
                <span className="text-[10px] text-slate-450 block mt-0.5">Kickstart the day of training with focus points</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="time"
                value={morningTime}
                onChange={(e) => setMorningTime(e.target.value)}
                disabled={!morningEnabled}
                className="bg-slate-900 border border-slate-800 focus:border-[#00FF95] text-xs font-mono text-slate-100 rounded-lg px-2.5 py-1.5 outline-none selection:bg-[#00FF95]/30 disabled:opacity-40"
              />
              <button
                onClick={() => setMorningEnabled(!morningEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${
                  morningEnabled ? "bg-[#00FF95]" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-[#0d151c] transition-all shadow-md transform ${
                  morningEnabled ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          {/* 2. MID-DAY ALERT */}
          <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between gap-4 transition-all hover:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border ${
                midDayEnabled 
                  ? "bg-sky-500/10 text-sky-450 border-sky-500/20" 
                  : "bg-slate-900 text-slate-550 border-slate-850"
              }`}>
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Middle-of-Day Motivation</span>
                <span className="text-[10px] text-slate-450 block mt-0.5">Midday squad updates & active progress slacker checks</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="time"
                value={midDayTime}
                onChange={(e) => setMidDayTime(e.target.value)}
                disabled={!midDayEnabled}
                className="bg-slate-900 border border-slate-800 focus:border-[#00FF95] text-xs font-mono text-slate-100 rounded-lg px-2.5 py-1.5 outline-none disabled:opacity-40"
              />
              <button
                onClick={() => setMidDayEnabled(!midDayEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${
                  midDayEnabled ? "bg-[#00FF95]" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-[#0d151c] transition-all shadow-md transform ${
                  midDayEnabled ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

          {/* 3. NIGHT ALERT */}
          <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl flex items-center justify-between gap-4 transition-all hover:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border ${
                nightEnabled 
                  ? "bg-violet-500/10 text-violet-400 border-violet-500/20" 
                  : "bg-slate-900 text-slate-550 border-slate-850"
              }`}>
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-200 block">Late Night Completion Panic</span>
                <span className="text-[10px] text-slate-450 block mt-0.5">High stakes notification before stats roll over and penalty is logged</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="time"
                value={nightTime}
                onChange={(e) => setNightTime(e.target.value)}
                disabled={!nightEnabled}
                className="bg-slate-900 border border-slate-800 focus:border-[#00FF95] text-xs font-mono text-slate-100 rounded-lg px-2.5 py-1.5 outline-none disabled:opacity-40"
              />
              <button
                onClick={() => setNightEnabled(!nightEnabled)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${
                  nightEnabled ? "bg-[#00FF95]" : "bg-slate-800"
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-[#0d151c] transition-all shadow-md transform ${
                  nightEnabled ? "translate-x-4" : "translate-x-0"
                }`} />
              </button>
            </div>
          </div>

        </div>

        {/* CUSTOMIZED MESSAGE TEMPLATE EDITOR */}
        <div className="space-y-3 pt-3">
          <label className="text-xs font-mono text-slate-350 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5 text-[#00FF95]" />
            Custom Message Engine Template
          </label>
          <textarea
            value={customTemplate}
            onChange={(e) => setCustomTemplate(e.target.value)}
            rows={3}
            className="w-full bg-slate-900 border border-slate-800 focus:border-[#00FF95] rounded-xl p-3.5 text-xs text-slate-200 outline-none leading-relaxed resize-none selection:bg-[#00FF95]/30"
            placeholder="Write dynamic message rules..."
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-mono text-slate-450 uppercase block mr-1">Placeholders:</span>
            {["{USER}", "{FOCUS}", "{EXERCISE}", "{STREAK}"].map(ph => (
              <button
                key={ph}
                onClick={() => setCustomTemplate(prev => prev + " " + ph)}
                className="text-[9px] font-mono bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-[#00FF95] px-2 py-1 rounded border border-slate-850 cursor-pointer"
              >
                {ph}
              </button>
            ))}
          </div>
        </div>

        {/* CORE ACTION SUBMISSION CONFIG */}
        <div className="pt-4 border-t border-slate-900 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-500">
            {saveSuccess ? (
              <span className="text-[#00FF95] flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" /> Schedule configurations updated!
              </span>
            ) : (
              <span>Values auto-synchronized locally</span>
            )}
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-[#00FF95] hover:bg-emerald-400 disabled:opacity-55 text-slate-950 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-2 shadow-md shadow-[#00ff9513]"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? "Saving..." : "Commit Alarm Times"}
          </button>
        </div>

      </div>

      {/* RIGHT: LIVE TELEMETRY MOBILE LOCKSCREEN TESTING RIG */}
      <div className="lg:col-span-5 bg-[#111827]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
        
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <h4 className="font-display font-extrabold text-white text-sm">Lock-screen Simulator</h4>
          </div>
          <p className="text-xs text-slate-400 leading-normal mb-4">
            Test the morning, mid-day, and night notification styles immediately for any squad member. 
          </p>

          <div className="space-y-4">
            
            {/* User Picker */}
            <div className="flex items-center justify-between gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
              <span className="text-xs font-mono text-slate-350">Preview as User:</span>
              <select
                value={testUser}
                onChange={(e) => setTestUser(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1 outline-none font-semibold cursor-pointer"
              >
                {Object.values(users).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Simulated Mobile Lock Screen Body */}
            <div className="bg-[#0c131d] border-4 border-slate-800 rounded-[2.5rem] p-5 py-6 shadow-2xl relative w-full aspect-[9/14] max-w-[240px] mx-auto overflow-hidden flex flex-col justify-between">
              
              {/* Speaker / Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-slate-800 rounded-b-xl flex items-center justify-center">
                <div className="w-8 h-1 bg-slate-900 rounded-full" />
              </div>

              {/* Lock screen Clock */}
              <div className="text-center pt-3 select-none">
                <span className="text-3xl font-light text-slate-100 font-mono tracking-tighter">01:24</span>
                <span className="text-[9px] block text-slate-450 uppercase tracking-widest font-mono mt-1">Monday, May 25</span>
              </div>

              {/* Notification bubble slot */}
              <div className="flex-1 flex items-center justify-center py-4">
                <AnimatePresence mode="wait">
                  {mockNotification ? (
                    <motion.div
                      key={mockNotification.message}
                      initial={{ opacity: 0, scale: 0.85, y: -20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.85, y: 20 }}
                      className="bg-slate-900/90 [box-shadow:0_4px_16px_rgba(0,0,0,0.6)] border border-slate-800 rounded-2xl p-3 w-full space-y-2 relative"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/40 pb-1.5">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-400 uppercase tracking-wide">
                          <Sparkles className="w-3 h-3 animate-pulse" />
                          <span>{mockNotification.title}</span>
                        </div>
                        <span className="text-[8px] font-mono text-slate-500">Just Now</span>
                      </div>

                      <p className="text-[10px] text-slate-200 font-medium leading-relaxed">
                        {mockNotification.message}
                      </p>

                      <div className="text-[8px] font-mono text-slate-450 uppercase flex items-center gap-1 cursor-pointer">
                        <CornerDownRight className="w-2.5 h-2.5" /> Swipe to open log
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-slate-650 text-[10px] font-mono text-center max-w-[120px] select-none italic">
                      Locked. Trigger an alarm drill below.
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick lock screen shortcuts */}
              <div className="flex items-center justify-between px-2 pb-1 text-slate-400 text-xs">
                <div className="w-6 h-6 rounded-full bg-slate-850 flex items-center justify-center border border-slate-800/60 font-mono text-[9px]">🎤</div>
                <div className="w-6 h-6 rounded-full bg-slate-850 flex items-center justify-center border border-slate-800/60 font-mono text-[9px]">📷</div>
              </div>

            </div>

          </div>
        </div>

        {/* ALARM DRILL TEST TRIGGERS */}
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-slate-450 uppercase tracking-wider block font-bold text-center">
            Fire simulated reminder events
          </p>
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
            <button
              id="test-midday-alarm-btn"
              onClick={() => triggerTestReminders("morning")}
              disabled={isTesting !== null}
              className="bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 hover:border-amber-500/35 p-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-45 transition-all text-center"
            >
              <span>🌅 Morning</span>
              <Play className="w-3 h-3 text-amber-500 fill-amber-500" />
            </button>
            <button
              onClick={() => triggerTestReminders("midday")}
              disabled={isTesting !== null}
              className="bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 hover:border-sky-500/35 p-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-45 transition-all text-center"
            >
              <span>⚡ Mid-day</span>
              <Play className="w-3 h-3 text-sky-400 fill-sky-450" />
            </button>
            <button
              onClick={() => triggerTestReminders("night")}
              disabled={isTesting !== null}
              className="bg-slate-900 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 hover:border-violet-500/35 p-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-45 transition-all text-center"
            >
              <span>🚨 Night</span>
              <Play className="w-3 h-3 text-violet-400 fill-violet-400" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
