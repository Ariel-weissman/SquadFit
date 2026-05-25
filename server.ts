import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { PartyState, DayWorkout, Exercise, User, ActiveNudge, PunishmentConfig, HistoryEntry } from "./src/types";

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

// Setup Express
const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini API Client
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined in environments. System will run with witty local fallbacks.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Default initial state
const defaultUsers: { [id: string]: User } = {
  "user-1": {
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
  },
  "user-2": {
    id: "user-2",
    name: "Jordan (The Machine)",
    email: "jordan.fit@squadfit.com",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80",
    streak: 12,
    completionRate: 100,
    workoutsCompleted: 8,
    workoutsMissed: 0,
    weeklyTarget: 4,
    isSlacking: false
  },
  "user-3": {
    id: "user-3",
    name: "Sam (The Slacker)",
    email: "sam.rest@squadfit.com",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
    streak: 0,
    completionRate: 25,
    workoutsCompleted: 2,
    workoutsMissed: 6,
    weeklyTarget: 4,
    isSlacking: true
  },
  "user-4": {
    id: "user-4",
    name: "Chloe (The Coach)",
    email: "chloe.coach@squadfit.com",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
    streak: 7,
    completionRate: 85,
    workoutsCompleted: 7,
    workoutsMissed: 1,
    weeklyTarget: 4,
    isSlacking: false
  }
};

const defaultPlan: DayWorkout[] = [
  {
    dayName: "Monday (Day 1)",
    focus: "Calisthenics: Push Day & Handstand Foundations",
    exercises: [
      {
        id: "ex-1",
        name: "Wall Handstand Holds",
        sets: 4,
        reps: "30-45s",
        rest: "90s",
        completedBy: { "user-1": true, "user-2": true, "user-3": false, "user-4": true }
      },
      {
        id: "ex-2",
        name: "Decline Pike Push-Ups",
        sets: 3,
        reps: "8-12",
        rest: "60s",
        completedBy: { "user-1": true, "user-2": true, "user-3": false, "user-4": true }
      },
      {
        id: "ex-3",
        name: "Strict Diamond Push-Ups",
        sets: 3,
        reps: "12-15",
        rest: "60s",
        completedBy: { "user-1": false, "user-2": true, "user-3": false, "user-4": true }
      },
      {
        id: "ex-4",
        name: "Crow Pose to Pike Hold Transitions",
        sets: 3,
        reps: "5 reps",
        rest: "2 mins",
        completedBy: { "user-1": false, "user-2": true, "user-3": false, "user-4": false }
      }
    ]
  },
  {
    dayName: "Wednesday (Day 2)",
    focus: "Calisthenics: Pull & Core Compression",
    exercises: [
      {
        id: "ex-5",
        name: "Strict Pull-Ups (Chest to Bar)",
        sets: 4,
        reps: "6-10",
        rest: "90s",
        completedBy: { "user-1": true, "user-2": true, "user-3": true, "user-4": true }
      },
      {
        id: "ex-6",
        name: "L-Sit Holds (Parallel Bars)",
        sets: 4,
        reps: "15-20s",
        rest: "60s",
        completedBy: { "user-1": false, "user-2": true, "user-3": false, "user-4": true }
      },
      {
        id: "ex-7",
        name: "Hanging Leg Raises",
        sets: 3,
        reps: "10-12",
        rest: "60s",
        completedBy: { "user-1": false, "user-2": true, "user-3": false, "user-4": false }
      }
    ]
  },
  {
    dayName: "Friday (Day 3)",
    focus: "Calisthenics: Leg Compression & Pistol Squat Prep",
    exercises: [
      {
        id: "ex-8",
        name: "Assisted / Full Pistol Squats",
        sets: 3,
        reps: "6-8 each leg",
        rest: "90s",
        completedBy: { "user-1": false, "user-2": true, "user-3": false, "user-4": true }
      },
      {
        id: "ex-9",
        name: "Nordic Hamstring Curl Regressions",
        sets: 3,
        reps: "6-8",
        rest: "90s",
        completedBy: { "user-1": false, "user-2": true, "user-3": false, "user-4": true }
      },
      {
        id: "ex-10",
        name: "Explosive Box Jumps",
        sets: 4,
        reps: "10-12",
        rest: "60s",
        completedBy: { "user-1": false, "user-2": true, "user-3": false, "user-4": false }
      }
    ]
  }
];

const defaultNudges: ActiveNudge[] = [
  {
    id: "nudge-1",
    fromUser: "user-4",
    toUser: "user-3",
    message: "Hey Sam, your couch called. It misses you! Let's hit today's pullup checklist before Jordan does it twice.",
    channel: "push",
    timestamp: new Date().toISOString()
  }
];

const defaultHistory: HistoryEntry[] = [
  {
    id: "hist-1",
    userId: "user-2",
    userName: "Jordan (The Machine)",
    userAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80",
    workoutTitle: "Monday (Day 1) - Push & Handstand",
    workoutType: "Calisthenics",
    completedAt: "2026-05-24T18:30:00Z",
    exercises: [
      { name: "Wall Handstand Holds", sets: 4, reps: "45s" },
      { name: "Decline Pike Push-Ups", sets: 3, reps: "12" },
      { name: "Strict Diamond Push-Ups", sets: 3, reps: "15" },
      { name: "Crow Pose to Pike Hold Transitions", sets: 3, reps: "5 reps" }
    ]
  },
  {
    id: "hist-2",
    userId: "user-1",
    userName: "Ariel",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
    workoutTitle: "Wednesday (Day 2) - Pull & Core Compression",
    workoutType: "Calisthenics",
    completedAt: "2026-05-24T09:15:00Z",
    exercises: [
      { name: "Strict Pull-Ups (Chest to Bar)", sets: 4, reps: "8" },
      { name: "L-Sit Holds (Parallel Bars)", sets: 4, reps: "20s" }
    ]
  },
  {
    id: "hist-3",
    userId: "user-4",
    userName: "Chloe (The Coach)",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
    workoutTitle: "Heavy Squat Matrix",
    workoutType: "Powerlifting",
    completedAt: "2026-05-23T15:00:00Z",
    exercises: [
      { name: "Barbell Back Squats", sets: 5, reps: "5" },
      { name: "Nordic Hamstring Curls", sets: 3, reps: "8" }
    ]
  },
  {
    id: "hist-4",
    userId: "user-1",
    userName: "Ariel",
    userAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
    workoutTitle: "Friday (Day 3) - Leg & Pistol Squat Prep",
    workoutType: "Calisthenics",
    completedAt: "2026-05-22T17:45:00Z",
    exercises: [
      { name: "Assisted / Full Pistol Squats", sets: 3, reps: "8 reps each leg" },
      { name: "Nordic Hamstring Curl Regressions", sets: 3, reps: "6 reps" }
    ]
  },
  {
    id: "hist-5",
    userId: "user-2",
    userName: "Jordan (The Machine)",
    userAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80",
    workoutTitle: "Friday (Day 3) - Leg & Pistol Squat Prep",
    workoutType: "Calisthenics",
    completedAt: "2026-05-22T16:00:00Z",
    exercises: [
      { name: "Assisted / Full Pistol Squats", sets: 3, reps: "8 each leg" },
      { name: "Nordic Hamstring Curl Regressions", sets: 3, reps: "8" },
      { name: "Explosive Box Jumps", sets: 4, reps: "12" }
    ]
  },
  {
    id: "hist-6",
    userId: "user-3",
    userName: "Sam (The Slacker)",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
    workoutTitle: "Wednesday (Day 2) - Pull Day",
    workoutType: "Calisthenics",
    completedAt: "2026-05-20T11:30:00Z",
    exercises: [
      { name: "Strict Pull-Ups (Chest to Bar)", sets: 4, reps: "6" }
    ]
  },
  {
    id: "hist-7",
    userId: "user-4",
    userName: "Chloe (The Coach)",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
    workoutTitle: "Overhead Lockout Stability",
    workoutType: "Functional Strength",
    completedAt: "2026-05-19T08:00:00Z",
    exercises: [
      { name: "Y-Raises with Plates", sets: 3, reps: "15" },
      { name: "Active Hangs on Bar", sets: 3, reps: "60 seconds" }
    ]
  }
];

const defaultReminderSettings = {
  morningEnabled: true,
  morningTime: "08:00",
  midDayEnabled: true,
  midDayTime: "13:30",
  nightEnabled: true,
  nightTime: "20:30",
  customMessageTemplate: "🚨 {USER}, lock in your training! Today's squad focus is {FOCUS}. Complete `{EXERCISE}` to protect your streak of {STREAK} days!"
};

// In-Memory Database State
let state: PartyState = {
  id: "party-champs",
  name: "Omega-Core Calisthenics",
  users: JSON.parse(JSON.stringify(defaultUsers)),
  activePlan: JSON.parse(JSON.stringify(defaultPlan)),
  punishmentConfig: {
    model: "scaled-percentage",
    flatRateAmount: 10,
    weeklyPayloadPool: "400 burpees or $40 group penalty",
    customPrompt: ""
  },
  nudges: JSON.parse(JSON.stringify(defaultNudges)),
  history: JSON.parse(JSON.stringify(defaultHistory)),
  reminderSettings: JSON.parse(JSON.stringify(defaultReminderSettings))
};

// --- CORE UTILITY FOR AI RETURNING WORKOUT PLANS ---
const workoutResponseSchema = {
  type: Type.OBJECT,
  properties: {
    days: {
      type: Type.ARRAY,
      description: "A list of training days making up the training routine.",
      items: {
        type: Type.OBJECT,
        properties: {
          dayName: { type: Type.STRING, description: "e.g., 'Monday (Day 1)', 'Wednesday (Day 2)' or similar." },
          focus: { type: Type.STRING, description: "Specific focus of the day (e.g., Pull Day, Leg day, core compression)." },
          exercises: {
            type: Type.ARRAY,
            description: "Exercises to perform on this day.",
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Detailed exercise name." },
                sets: { type: Type.INTEGER, description: "Number of standard sets." },
                reps: { type: Type.STRING, description: "Rep target (e.g., '8-12', '15s hold', 'Max reps')." },
                rest: { type: Type.STRING, description: "Rest range (e.g., '60 seconds', '2 mins')." }
              },
              required: ["name", "sets", "reps", "rest"]
            }
          }
        },
        required: ["dayName", "focus", "exercises"]
      }
    }
  },
  required: ["days"]
};

// 1. GET State
app.get("/api/state", (req, res) => {
  res.json(state);
});

// 2. POST Reset
app.post("/api/state/reset", (req, res) => {
  state = {
    id: "party-champs",
    name: "Omega-Core Calisthenics",
    users: JSON.parse(JSON.stringify(defaultUsers)),
    activePlan: JSON.parse(JSON.stringify(defaultPlan)),
    punishmentConfig: {
      model: "scaled-percentage",
      flatRateAmount: 10,
      weeklyPayloadPool: "400 burpees or $40 group penalty",
      customPrompt: ""
    },
    nudges: JSON.parse(JSON.stringify(defaultNudges)),
    history: JSON.parse(JSON.stringify(defaultHistory)),
    reminderSettings: JSON.parse(JSON.stringify(defaultReminderSettings))
  };
  res.json({ status: "success", data: state });
});

// 2b. POST Clear all data
app.post("/api/state/clear", (req, res) => {
  const clearedUsers = JSON.parse(JSON.stringify(defaultUsers));
  Object.keys(clearedUsers).forEach((uid) => {
    clearedUsers[uid].streak = 0;
    clearedUsers[uid].completionRate = 0;
    clearedUsers[uid].workoutsCompleted = 0;
    clearedUsers[uid].workoutsMissed = 0;
    clearedUsers[uid].isSlacking = false;
  });

  const clearedPlan = JSON.parse(JSON.stringify(defaultPlan));
  clearedPlan.forEach((day: any) => {
    day.exercises.forEach((ex: any) => {
      ex.completedBy = {};
    });
  });

  state = {
    id: "party-champs",
    name: "SquadFit Sandbox",
    users: clearedUsers,
    activePlan: clearedPlan,
    punishmentConfig: {
      model: "scaled-percentage",
      flatRateAmount: 10,
      weeklyPayloadPool: "Empty Penalty Pool!",
      customPrompt: ""
    },
    nudges: [],
    history: [],
    reminderSettings: JSON.parse(JSON.stringify(defaultReminderSettings))
  };
  res.json({ status: "success", data: state });
});

// 3. POST Configure Punishment Model
app.post("/api/party/config", (req, res) => {
  const { model, flatRateAmount, weeklyPayloadPool, customPrompt } = req.body;
  
  if (model) state.punishmentConfig.model = model;
  if (flatRateAmount !== undefined) state.punishmentConfig.flatRateAmount = Number(flatRateAmount);
  if (weeklyPayloadPool !== undefined) state.punishmentConfig.weeklyPayloadPool = weeklyPayloadPool;
  if (customPrompt !== undefined) state.punishmentConfig.customPrompt = customPrompt;

  res.json({ status: "success", config: state.punishmentConfig });
});

// 4. POST Generate Workout Routine (AI)
app.post("/api/workout/generate", async (req, res) => {
  const { trainingDays, preferences, specificGoals, limitations } = req.body;

  const prompt = `
    Design a fully-structured, professional training plan for a competitive fitness group.
    
    Parameters provided:
    - Number of Training Days Available: ${trainingDays || '3 days'}
    - Training Styles / Preferences: ${preferences || 'Calisthenics, functional strength'}
    - Specific Goals: ${specificGoals || 'Core strength, handstands, overhead stability'}
    - Equipment / Limitations: ${limitations || 'No heavy equipment, bodyweight & parallettes focus'}
    
    Ensure you structure balanced daily routines. Provide sets, reps, and precise rest counts. Try to deliver realistic and engaging exercises.
  `;

  const ai = getAI();
  if (!ai) {
    // If no API key, compile mock custom plan based on keywords
    console.log("No Gemini API key. Generating stylish mock response...");
    
    const count = Number(trainingDays) || 3;
    const mockDays: DayWorkout[] = [];
    for (let i = 1; i <= count; i++) {
      mockDays.push({
        dayName: `Trainer Day ${i} (Custom)`,
        focus: `Target Focus: ${preferences || 'All-rounder strength'} & ${specificGoals || 'Core Stabilization'}`,
        exercises: [
          {
            id: generateId(),
            name: `${preferences.includes('calisthenics') ? 'Explosive Handstand Practice' : 'Weighted Compounds'} (A1)`,
            sets: 4,
            reps: "10-12 reps",
            rest: "90s",
            completedBy: {}
          },
          {
            id: generateId(),
            name: `Focus Drill: ${specificGoals || 'High-tension compression hold'} (A2)`,
            sets: 3,
            reps: "30s hold",
            rest: "60s",
            completedBy: {}
          },
          {
            id: generateId(),
            name: `Finisher: Auxiliary Burnout`,
            sets: 3,
            reps: "15 reps",
            rest: "45s",
            completedBy: {}
          }
        ]
      });
    }
    state.activePlan = mockDays;
    // reset completion stats for test
    Object.keys(state.users).forEach(uid => {
      state.users[uid].workoutsCompleted = 0;
      state.users[uid].workoutsMissed = 0;
      state.users[uid].completionRate = 0;
    });
    return res.json({ status: "success", plan: state.activePlan });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the ultimate digital gym coach. You structure competitive group training with clear sets, reps, and rests. Respond ONLY with a standard JSON matching the target schema.",
        responseMimeType: "application/json",
        responseSchema: workoutResponseSchema
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    if (parsed && Array.isArray(parsed.days)) {
      const formattedPlan: DayWorkout[] = parsed.days.map((day: any, i: number) => ({
        dayName: day.dayName || `Workout Day ${i + 1}`,
        focus: day.focus || "General Conditioning",
        exercises: (day.exercises || []).map((ex: any) => ({
          id: generateId(),
          name: ex.name,
          sets: Number(ex.sets) || 3,
          reps: String(ex.reps),
          rest: String(ex.rest),
          completedBy: {}
        }))
      }));

      state.activePlan = formattedPlan;
      // Rescale completion stats
      Object.keys(state.users).forEach(uid => {
        state.users[uid].workoutsCompleted = 0;
        state.users[uid].workoutsMissed = 0;
        state.users[uid].completionRate = 0;
      });

      res.json({ status: "success", plan: state.activePlan });
    } else {
      throw new Error("Parsed content failed schema checking.");
    }
  } catch (err: any) {
    console.error("AI Generation Error", err);
    res.status(500).json({ error: "Could not generate AI workout plan. Try again later.", details: err.message });
  }
});

// 5. POST Workout Toggle Completion (Real-time checkoff)
app.post("/api/workout/toggle", (req, res) => {
  const { exerciseId, userId, completed } = req.body;
  
  if (!userId || !exerciseId) {
    return res.status(400).json({ error: "Missing exercise or user ID" });
  }

  let found = false;
  state.activePlan.forEach(day => {
    day.exercises.forEach(ex => {
      if (ex.id === exerciseId) {
        ex.completedBy[userId] = !!completed;
        found = true;
      }
    });
  });

  if (found) {
    // Recalculate completion rate metrics for this user
    // Completion rate is percentage of active plan exercises completed by this user
    let totalExercises = 0;
    let completedExercises = 0;

    state.activePlan.forEach(day => {
      day.exercises.forEach(ex => {
        totalExercises++;
        if (ex.completedBy[userId]) {
          completedExercises++;
        }
      });
    });

    const user = state.users[userId];
    if (user) {
      user.completionRate = totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;
      // Update custom streaks logic
      if (user.completionRate > 80) {
        user.streak = Math.max(user.streak, 3) + 1;
        user.isSlacking = false;
      } else if (user.completionRate < 35) {
        user.isSlacking = true;
      }
      user.workoutsCompleted = completedExercises;
      user.workoutsMissed = Math.max(0, totalExercises - completedExercises);
    }

    res.json({ status: "success", data: state });
  } else {
    res.status(404).json({ error: "Exercise not found in current program" });
  }
});

// 6. POST Manual Edit Exercise (Manual Mode)
app.post("/api/workout/manual-edit", (req, res) => {
  const { exerciseId, name, sets, reps, rest } = req.body;

  let found = false;
  state.activePlan.forEach(day => {
    day.exercises = day.exercises.map(ex => {
      if (ex.id === exerciseId) {
        found = true;
        return {
          ...ex,
          name: name || ex.name,
          sets: sets !== undefined ? Number(sets) : ex.sets,
          reps: reps || ex.reps,
          rest: rest || ex.rest
          // Crucial decision: We keep the completions intact, but allow manual edits!
        };
      }
      return ex;
    });
  });

  if (found) {
    res.json({ status: "success", plan: state.activePlan });
  } else {
    res.status(404).json({ error: "Exercise not found for editing." });
  }
});

// 7. POST Conversational Edit Workout (AI Conversational Mode)
app.post("/api/workout/conversational-edit", async (req, res) => {
  const { whisperInput } = req.body;

  if (!whisperInput) {
    return res.status(400).json({ error: "Direct edit message is required." });
  }

  const prompt = `
    You are an elite, flexible fitness coach modifier.
    We have a current group workout schedule:
    ${JSON.stringify(state.activePlan, null, 2)}

    The user submitted this customization request:
    "${whisperInput}"

    Update the workouts with high surgical precision. Adhere to these directions:
    1. Only swap out, delete, or add exercises directly specified in the request. Keep the untouched workouts entirely intact!
    2. Try to match exercise goals (e.g., if overhead push is injured, replace it with lower-weight front-raises or strict core compression, keeping structural integrity of the push day).
    3. Keep existing structure's IDs where applicable, but define new IDs for newly registered exercises.
  `;

  const ai = getAI();
  if (!ai) {
    // Fallback parser if API keys aren't ready
    console.log("No Gemini API key for editing. Executing procedural mock modifications...");
    // Modify one name in the plan for visual feedback
    state.activePlan[0].exercises[0].name += " (Injury Modified Drop)";
    state.activePlan[0].exercises[0].reps = "12 reps (Lighter weight)";
    return res.json({ status: "success", plan: state.activePlan, comment: "Mock engine resolved injury drop-down swap." });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an accurate, smart custom coach. You rewrite existing workout lists matching the schema.",
        responseMimeType: "application/json",
        responseSchema: workoutResponseSchema
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    if (parsed && Array.isArray(parsed.days)) {
      // Re-map while preserving completion stats of unchanged exercises where possible
      const newPlan: DayWorkout[] = parsed.days.map((day: any) => {
        return {
          dayName: day.dayName,
          focus: day.focus,
          exercises: (day.exercises || []).map((e: any) => {
            // See if we have an exercise with the same name already. If so, preserve completion!
            const match = state.activePlan
              .flatMap((d) => d.exercises)
              .find((oldEx) => oldEx.name.toLowerCase() === e.name.toLowerCase() || oldEx.id === e.id);

            return {
              id: match ? match.id : generateId(),
              name: e.name,
              sets: Number(e.sets) || 3,
              reps: String(e.reps),
              rest: String(e.rest),
              completedBy: match ? match.completedBy : {}
            };
          })
        };
      });

      state.activePlan = newPlan;
      res.json({ status: "success", plan: state.activePlan });
    } else {
      throw new Error("Generated edit format invalid.");
    }
  } catch (err: any) {
    console.error("AI Conversational Edit failed", err);
    res.status(500).json({ error: "Failed to parse AI conversational instructions.", details: err.message });
  }
});

// 8. POST Friend Nudge (Creative dynamic roaster)
app.post("/api/party/nudge", async (req, res) => {
  const { fromUserId, toUserId } = req.body;
  
  const fromUser = state.users[fromUserId || "user-4"];
  const toUser = state.users[toUserId || "user-3"];

  if (!toUser) {
    return res.status(404).json({ error: "Target friend not found" });
  }

  // Generate roast/nudge prompt
  const nudgePrompt = `
    Write a witty, sharp, hilarious, and slightly motivating Duolingo-style push notification nudge.
    
    Context:
    - Sender: ${fromUser ? fromUser.name : 'Chloe (The Coach)'} (who is killing it)
    - Slacker to motivate: ${toUser.name}
    - Current Slacker Stats: Streak is ${toUser.streak} days, completion rate is ${toUser.completionRate}%, missed ${toUser.workoutsMissed} workouts this week alone!
    - Tone: Sarcastic, motivational coach, chaotic gym partner. Keep it strictly under 130 characters! No generic boring sentences. Make it pack a major punch.
  `;

  const ai = getAI();
  let text = `Hey ${toUser.name}, ${fromUser ? fromUser.name : 'Chloe'} is checking in. Your workout sheet looks dryer than chalk! Let's get moving!`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: nudgePrompt,
        config: {
          systemInstruction: "You write under-130-characters chaotic gym-partner roasts. Direct, funny and slightly mean but encouraging.",
        }
      });
      if (response.text) {
        text = response.text.trim().replace(/^"|"$/g, '');
      }
    } catch (err) {
      console.warn("Gemini roast failed, using witty preset.");
    }
  } else {
    // creative static options representing chaotic partner to prevent boring prompts
    const funnyQuotes = [
      `Your weights are crying, ${toUser.name}. They want to be lifted, but you're too busy swiping! Let's go!`,
      `Even Jordan's pre-workout has a longer lifespan than your workout streak right now, ${toUser.name}. Wake up!`,
      `Missing workout day again? Ariel is already planning your 100 burpee penalty card. Get up now!`,
      `Sam, I hear the couch is filing for joint custody of your glutes. Go check those checkboxes!`
    ];
    text = funnyQuotes[Math.floor(Math.random() * funnyQuotes.length)];
  }

  const newNudge: ActiveNudge = {
    id: generateId(),
    fromUser: fromUser ? fromUser.id : "user-4",
    toUser: toUser.id,
    message: text,
    channel: "push",
    timestamp: new Date().toISOString()
  };

  state.nudges.unshift(newNudge);
  res.json({ status: "success", nudge: newNudge, allNudges: state.nudges });
});

// 9. POST Calculate dynamic social penalties (The Dynamic Punishment Engine)
app.post("/api/party/punishment/calculate", async (req, res) => {
  const { settingOption } = req.body;
  const config = state.punishmentConfig;
  
  if (settingOption) {
    config.model = settingOption;
  }

  // Calculate stats
  const usersArray = Object.values(state.users);
  let totalMissedWorkouts = usersArray.reduce((acc, curr) => acc + curr.workoutsMissed, 0);

  // Fallback if 0 missed to make interactive demos entertaining!
  if (totalMissedWorkouts === 0) {
    totalMissedWorkouts = 8; // inject fake count for calculation simulation density
  }

  // Model calculation outputs:
  // 1. Scaled Weekly scaled punishment (Percentage-Based split)
  const scaledSplit = usersArray.map(user => {
    // simulate realistic values if completion state is perfect right now
    const missed = user.workoutsMissed || (user.id === 'user-3' ? 6 : user.id === 'user-1' ? 2 : 0);
    const totalSimulatedMissed = 8;
    const share = Math.round((missed / totalSimulatedMissed) * 100);
    
    return {
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      missedCount: missed,
      scaledPercentage: share,
      penaltyShare: `${share}% of ${config.weeklyPayloadPool}`
    };
  }).sort((a,b) => b.scaledPercentage - a.scaledPercentage);

  // 2. Per-Workout Flat Rate Price Model
  const flatRates = usersArray.map(user => {
    const missed = user.workoutsMissed || (user.id === 'user-3' ? 6 : user.id === 'user-1' ? 2 : 0);
    return {
      userId: user.id,
      name: user.name,
      missed,
      feeOwed: missed * config.flatRateAmount,
      formattedFee: `$${missed * config.flatRateAmount}`
    };
  });

  // 3. Workout-Geared Punishment (Dynamic generation based on the target theme)
  let workoutGearedExercises: string[] = [];
  
  const ai = getAI();
  const gearedPrompt = `
    The fitness squad missed a combined total of ${totalMissedWorkouts} workouts this week targeting Calisthenics Push & Pull Day components.
    Generate a hilarious, painful 3-exercise 'Squad Punishment Ritual' to repay their dues.
    Each exercise must sound extreme and slightly themed around repayment. Format in markdown under-30-words each.
  `;

  if (ai) {
    try {
      const resp = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: gearedPrompt,
        config: {
          systemInstruction: "You are a chaotic gym coach generating a penalty card. Create three funny bodyweight exercises. Limit responses.",
        }
      });
      if (resp.text) {
        workoutGearedExercises = resp.text.split("\n").filter(line => line.trim().length > 3);
      }
    } catch (e) {
      console.warn("Geared workout generation failed.");
    }
  }

  if (workoutGearedExercises.length === 0) {
    workoutGearedExercises = [
      "💪 80 Strict Penalty Burpees (To repay push-day negligence)",
      "🧘 4-Minute Crucifix Posture Wall Sits",
      "🦦 150 Hollow Body Rockers (To pay for pull day omissions)"
    ];
  }

  res.json({
    status: "success",
    modelChosen: config.model,
    scaledSplit,
    flatRates,
    workoutGearedExercises
  });
});

// 10. POST Log Completed Workout into History
app.post("/api/workout/log", (req, res) => {
  const { userId, workoutTitle, workoutType, exercises } = req.body;
  
  if (!userId || !workoutTitle || !exercises || !Array.isArray(exercises)) {
    return res.status(400).json({ error: "Missing required workout metadata structure" });
  }

  const user = state.users[userId];
  if (!user) {
    return res.status(404).json({ error: "Active user identity not located in registry" });
  }

  const newLog: HistoryEntry = {
    id: "hist-" + generateId(),
    userId,
    userName: user.name,
    userAvatar: user.avatar,
    workoutTitle,
    workoutType: workoutType || "Calisthenics",
    completedAt: new Date().toISOString(),
    exercises: exercises.map((ex: any) => ({
      name: ex.name || "Custom Drill",
      sets: Number(ex.sets) || 3,
      reps: String(ex.reps || "10 reps")
    }))
  };

  state.history.unshift(newLog);

  // Update real-time statistics
  user.workoutsCompleted += 1;
  user.streak += 1;
  user.isSlacking = false;
  
  // Recalculate completion rate based on historical improvements (soft bound to caps)
  user.completionRate = Math.min(100, user.completionRate + 15);

  res.json({ status: "success", history: state.history, data: state });
});

// 11. POST Update Reminder Settings
app.post("/api/reminders/config", (req, res) => {
  const { morningEnabled, morningTime, midDayEnabled, midDayTime, nightEnabled, nightTime, customMessageTemplate } = req.body;
  
  if (morningEnabled !== undefined) state.reminderSettings.morningEnabled = !!morningEnabled;
  if (morningTime !== undefined) state.reminderSettings.morningTime = String(morningTime);
  if (midDayEnabled !== undefined) state.reminderSettings.midDayEnabled = !!midDayEnabled;
  if (midDayTime !== undefined) state.reminderSettings.midDayTime = String(midDayTime);
  if (nightEnabled !== undefined) state.reminderSettings.nightEnabled = !!nightEnabled;
  if (nightTime !== undefined) state.reminderSettings.nightTime = String(nightTime);
  if (customMessageTemplate !== undefined) state.reminderSettings.customMessageTemplate = String(customMessageTemplate);

  res.json({ status: "success", reminderSettings: state.reminderSettings, data: state });
});

// 12. POST Generate / Test Specific Notification Reminder
app.post("/api/reminders/test", async (req, res) => {
  const { userId, timeOfDay } = req.body;
  const user = state.users[userId || "user-1"];
  const currentDay = state.activePlan[0] || { dayName: "Training Day", focus: "Full Body Mastery", exercises: [{ name: "Handstand Holds" }] };
  const firstExercise = currentDay.exercises[0]?.name || "Core drills";
  const focus = currentDay.focus || "Calisthenics Conditioning";

  const template = state.reminderSettings.customMessageTemplate || 
    "🚨 {USER}, lock in your training! Today's squad focus is {FOCUS}. Complete `{EXERCISE}` to protect your streak of {STREAK} days!";

  let notificationText = template
    .replace("{USER}", user.name)
    .replace("{FOCUS}", focus)
    .replace("{EXERCISE}", firstExercise)
    .replace("{STREAK}", String(user.streak));

  const ai = getAI();
  if (ai) {
    try {
      const timeLabel = timeOfDay === "morning" ? "Morning Rise & Grind reminder" : timeOfDay === "midday" ? "Midday momentum checks" : "Late-night urgent checkoff";
      const reminderPrompt = `
        Draft a high-energy push notification text for ${timeLabel}.
        Custom rules:
        - Target user: ${user.name} (streak: ${user.streak} days, workouts completed: ${user.workoutsCompleted})
        - Today's Training focus of the day: ${focus}
        - Initial exercise drill: ${firstExercise}
        - Strict tone requested: ${timeOfDay === "morning" ? "Highly energetic, supportive, kickstarting the day" : timeOfDay === "midday" ? "Moderate urgency, competitive, check if they checked off their boxes over lunch" : "High urgency, funny, panic-inducing warning about streaks and penalty fees/burpees"}
        - Limit: Max 120 characters total so it fits nicely on a mobile lock screen. Keep it punchy!
      `;
      const resp = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: reminderPrompt,
        config: {
          systemInstruction: "You write ultra lock-screen-friendly friendly gym notification reminders. Keep it witty and direct. Avoid generic prefixes.",
        }
      });
      if (resp.text) {
        notificationText = resp.text.trim().replace(/^"|"$/g, '');
      }
    } catch (e) {
      console.warn("Gemini reminder test generation failed, using formatted template default.", e);
    }
  } else {
    // Elegant fallback presets if Gemini key is absent
    const fallbackReminders = {
      morning: [
        `🌅 Rise & shine, ${user.name}! Today is ${currentDay.dayName} focusing on ${focus}. Open your log and get started!`,
        `💪 Morning grind time, ${user.name}! Chloe already logged. Your streak of ${user.streak} days is on the line!`,
        `☕ Morning check-in: Today's drill is ${firstExercise}. Avoid any slacking penalties!`
      ],
      midday: [
        `⚡ Afternoon slump? Not for ${user.name}! Knock out those sets of ${firstExercise} now!`,
        `🔥 Halfway through ${currentDay.dayName}! Your team is monitoring completion rates. Current count: ${user.workoutsCompleted} completed!`,
        `🥗 Post-lunch workout boost! Get those checked-off reps before the late-night panic!`
      ],
      night: [
        `🚨 CRITICAL hours, ${user.name}! Lock in those sets of ${firstExercise} before midnight!`,
        `💀 Streak in danger! Ariel is checking the logs. Don't lose your ${user.streak} day streak!`,
        `🔔 11th hour reminder! Finish today's focus is ${focus} or trigger the ${state.punishmentConfig.weeklyPayloadPool} split!`
      ]
    };

    const choiceList = fallbackReminders[timeOfDay as "morning" | "midday" | "night"] || fallbackReminders["morning"];
    notificationText = choiceList[Math.floor(Math.random() * choiceList.length)];
  }

  res.json({
    status: "success",
    timeOfDay,
    title: timeOfDay === "morning" ? "🌅 Morning Reminder" : timeOfDay === "midday" ? "⚡ Mid-Day Momentum" : "🚨 Late-Night Lock-In",
    message: notificationText,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar
  });
});

// Configure Vite middleware or Static Fallback
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development server mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static files server mounted.");
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`SquadFit App running happily at http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
