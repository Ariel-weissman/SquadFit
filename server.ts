import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { DayWorkout, User, ActiveNudge } from "./src/types";

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

// 1. POST Generate Custom Routine (AI Plan Generator)
app.post("/api/workout/generate", async (req, res) => {
  const { trainingDays, preferences, specificGoals, limitations } = req.body;

  const daysCount = Number(trainingDays) || 3;
  const style = String(preferences || "calisthenics");
  const goals = String(specificGoals || "general hypertrophy");
  const limits = String(limitations || "none");

  const prompt = `
    Create a highly functional premium ${daysCount}-day training microcycle structured around ${style}.
    Target Goals: ${goals}.
    Limitations / Equipment setup: ${limits}.
    
    Structure it strictly with exactly ${daysCount} separate Training Days.
    Provide realistic, exciting bodyweight exercises (like pike pushups, handstands, chin-ups, ring dips), or gym movements if applicable.
    Provide sets and logical reps (e.g. "8-12 reps", "30s hold", "Max effort") and rest times (e.g. "90s", "2 mins").
    
    Ensure results strictly conform to the expected JSON output format schema structure.
  `;

  const ai = getAI();
  if (!ai) {
    // Elegant fallbacks if API keys aren't ready
    console.log("No Gemini API key defined. Simulating local fallback...");
    const samplePlan: DayWorkout[] = [
      {
        dayName: "Monday (Day 1)",
        focus: `Strength Foundation (${style})`,
        exercises: [
          { id: "ex-" + generateId(), name: "Main Custom Drill", sets: 4, reps: "8-12", rest: "90s", completedBy: {} },
          { id: "ex-" + generateId(), name: "Auxiliary Isolation Work", sets: 3, reps: "12-15", rest: "60s", completedBy: {} }
        ]
      },
      {
        dayName: "Wednesday (Day 2)",
        focus: `Compression & Mobility (${goals})`,
        exercises: [
          { id: "ex-" + generateId(), name: "Core Target Holds", sets: 3, reps: "30s hold", rest: "60s", completedBy: {} },
          { id: "ex-" + generateId(), name: "Explosive Dynamics", sets: 4, reps: "6-8 reps", rest: "90s", completedBy: {} }
        ]
      }
    ];
    return res.json({ status: "success", plan: samplePlan });
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

      res.json({ status: "success", plan: formattedPlan });
    } else {
      throw new Error("Parsed content failed schema checking.");
    }
  } catch (err: any) {
    console.error("AI Generation Error", err);
    res.status(550).json({ error: "Could not generate AI workout plan. Try again later.", details: err.message });
  }
});

// 2. POST Conversational Edit Workout (AI Conversational Mode)
app.post("/api/workout/conversational-edit", async (req, res) => {
  const { whisperInput, currentPlan } = req.body;

  if (!whisperInput) {
    return res.status(400).json({ error: "Direct edit message is required." });
  }
  if (!currentPlan || !Array.isArray(currentPlan)) {
    return res.status(400).json({ error: "Current plan list is required." });
  }

  const prompt = `
    You are an elite, flexible fitness coach modifier.
    We have a current group workout schedule:
    ${JSON.stringify(currentPlan, null, 2)}

    The user submitted this customization request:
    "${whisperInput}"

    Update the workouts with high surgical precision. Adhere to these directions:
    1. Only swap out, delete, or add exercises directly specified in the request. Keep the untouched workouts entirely intact!
    2. Try to match exercise goals (e.g., if overhead push is injured, replace it with lower-weight front-raises or strict core compression, keeping structural integrity of the push day).
    3. Keep existing structure's IDs where applicable, but define new IDs for newly registered exercises.
  `;

  const ai = getAI();
  if (!ai) {
    console.log("No Gemini API key for editing. Executing procedural mock modifications...");
    const updated = JSON.parse(JSON.stringify(currentPlan));
    if (updated.length > 0 && updated[0].exercises.length > 0) {
      updated[0].exercises[0].name += " (Injury Modified Drop)";
      updated[0].exercises[0].reps = "12 reps (Lighter)";
    }
    return res.json({ status: "success", plan: updated, comment: "Mock engine resolved injury drop-down swap." });
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
      const newPlan: DayWorkout[] = parsed.days.map((day: any) => {
        return {
          dayName: day.dayName,
          focus: day.focus,
          exercises: (day.exercises || []).map((e: any) => {
            const match = currentPlan
              .flatMap((d: any) => d.exercises)
              .find((oldEx: any) => oldEx.name.toLowerCase() === e.name.toLowerCase() || oldEx.id === e.id);

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

      res.json({ status: "success", plan: newPlan });
    } else {
      throw new Error("Generated edit format invalid.");
    }
  } catch (err: any) {
    console.error("AI Conversational Edit failed", err);
    res.status(500).json({ error: "Failed to parse AI conversational instructions.", details: err.message });
  }
});

// 3. POST Friend Nudge (Witty dynamically computed roast)
app.post("/api/party/nudge", async (req, res) => {
  const { fromUser, toUser } = req.body;
  
  if (!toUser) {
    return res.status(400).json({ error: "Target slacker profile details are required" });
  }

  const nudgePrompt = `
    Write a witty, sharp, hilarious, and slightly motivating Duolingo-style push notification nudge/roast.
    
    Context:
    - Sender: ${fromUser ? fromUser.name : 'Chloe (The Coach)'} (who is doing great)
    - Slacker to roast: ${toUser.name}
    - Current Slacker Stats: Streak is ${toUser.streak} days, completion rate is ${toUser.completionRate || 0}%, missed ${toUser.workoutsMissed || 0} workouts this week!
    - Tone: Highly sarcastic, witty gym coach, chaotic motivational workout partner. Keep it strictly under 130 characters! No generic boring sentences. Make it pack a major punch.
  `;

  const ai = getAI();
  let text = `Hey ${toUser.name}, ${fromUser ? fromUser.name : 'Coach'} is checking in. Your workout sheet looks dryer than chalk! Get moving!`;

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
      console.warn("Gemini roast failed, using fallback.");
    }
  } else {
    const funnyQuotes = [
      `Your weights are crying, ${toUser.name}. They want to be lifted, but you're too busy resting! Let's go!`,
      `Even the coaching staff has a longer attention span than your workout streak right now, ${toUser.name}. Wake up!`,
      `Missing workout day again? We are already planning your burpee penalty card. Get up now!`,
      `I hear the couch is filing for joint custody of your glutes, ${toUser.name}. Go check those checkboxes!`
    ];
    text = funnyQuotes[Math.floor(Math.random() * funnyQuotes.length)];
  }

  const newNudge: ActiveNudge = {
    id: generateId(),
    fromUser: fromUser ? fromUser.id : "system",
    toUser: toUser.id,
    message: text,
    channel: "push",
    timestamp: new Date().toISOString()
  };

  res.json({ status: "success", nudge: newNudge });
});

// 4. POST Calculate dynamic social penalties (The Dynamic Punishment Engine)
app.post("/api/party/punishment/calculate", async (req, res) => {
  const { punishmentConfig, users } = req.body;

  const config = punishmentConfig || {
    model: "scaled-percentage",
    flatRateAmount: 10,
    weeklyPayloadPool: "400 burpees or $40 group penalty"
  };

  const usersArray: User[] = Array.isArray(users) ? users : users ? Object.values(users) : [];
  let totalMissedWorkouts = usersArray.reduce((acc, curr) => acc + (curr.workoutsMissed || 0), 0);

  if (totalMissedWorkouts === 0) {
    totalMissedWorkouts = 6; // simulation scale baseline
  }

  // 1. Scaled Weekly scaled punishment (Percentage-Based split)
  const scaledSplit = usersArray.map(user => {
    const missed = user.workoutsMissed !== undefined ? user.workoutsMissed : (user.isSlacking ? 4 : 1);
    const share = totalMissedWorkouts > 0 ? Math.round((missed / totalMissedWorkouts) * 100) : 0;
    
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
    const missed = user.workoutsMissed !== undefined ? user.workoutsMissed : (user.isSlacking ? 4 : 1);
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
    The fitness squad missed a combined total of ${totalMissedWorkouts} workouts this week.
    Generate a hilarious, painful 3-exercise 'Squad Punishment Ritual' to repay their dues.
    Each exercise must sound extreme and slightly themed around repayment or core penance. Format in markdown under-30-words each.
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

// 5. POST Generate / Test Specific Notification Reminder
app.post("/api/reminders/test", async (req, res) => {
  const { user, activePlan, reminderSettings, punishmentConfig, timeOfDay } = req.body;

  const activeUser = user || { name: "Champion", streak: 3, workoutsCompleted: 5 };
  const config = punishmentConfig || { weeklyPayloadPool: "200 burpees" };
  const currentPlan = activePlan || [];
  const currentDay = currentPlan[0] || { dayName: "Today", focus: "Full Body Mastery", exercises: [{ name: "Lunges" }] };
  const firstExercise = currentDay.exercises?.[0]?.name || "Core workout";
  const focus = currentDay.focus || "Daily routine Work";

  const template = (reminderSettings?.customMessageTemplate) || 
    "🚨 {USER}, lock in your training! Today's squad focus is {FOCUS}. Complete `{EXERCISE}` to protect your streak of {STREAK} days!";

  let notificationText = template
    .replace("{USER}", activeUser.name)
    .replace("{FOCUS}", focus)
    .replace("{EXERCISE}", firstExercise)
    .replace("{STREAK}", String(activeUser.streak || 0));

  const ai = getAI();
  if (ai) {
    try {
      const timeLabel = timeOfDay === "morning" ? "Morning Rise & Grind reminder" : timeOfDay === "midday" ? "Midday momentum checks" : "Late-night urgent checkoff";
      const reminderPrompt = `
        Draft a high-energy push notification text for ${timeLabel}.
        Custom rules:
        - Target user: ${activeUser.name} (streak: ${activeUser.streak || 0} days)
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
    const fallbackReminders = {
      morning: [
        `🌅 Rise & shine, ${activeUser.name}! Today is ${currentDay.dayName} focusing on ${focus}. Open your log and get started!`,
        `💪 Morning grind time, ${activeUser.name}! Teammates are logging. Your streak of ${activeUser.streak || 0} days is on the line!`,
        `☕ Morning check-in: Today's drill is ${firstExercise}. Avoid any slacking penalties!`
      ],
      midday: [
        `⚡ Afternoon slump? Not for ${activeUser.name}! Knock out those sets of ${firstExercise} now!`,
        `🔥 Halfway through training day! Your team is monitoring completion rates. Finish now!`,
        `🥗 Post-lunch workout boost! Get those checked-off reps before the late-night panic!`
      ],
      night: [
        `🚨 CRITICAL hours, ${activeUser.name}! Lock in those sets of ${firstExercise} before midnight!`,
        `💀 Streak in danger! Don't lose your ${activeUser.streak || 0} day streak!`,
        `🔔 11th hour reminder! Finish today's focus of ${focus} or trigger the ${config.weeklyPayloadPool} split!`
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
    userId: activeUser.id,
    userName: activeUser.name,
    userAvatar: activeUser.avatar || ""
  });
});

// Production startup hosting static assets built in /dist
if (!process.env.VERCEL && process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SquadFit App running happily at http://localhost:${PORT}`);
  });
}

export default app;
