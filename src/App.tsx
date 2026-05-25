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
  Bell,
  LogOut,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle,
  LockKeyhole
} from "lucide-react";
import { PartyState, DayWorkout, User, ActiveNudge, PunishmentConfig, HistoryEntry, ReminderSettings } from "./types";
import WorkoutPlanner from "./components/WorkoutPlanner";
import ActivityLeaderboard from "./components/ActivityLeaderboard";
import WorkoutHistory from "./components/WorkoutHistory";
import ReminderScheduler from "./components/ReminderScheduler";
import { motion, AnimatePresence } from "motion/react";

import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  writeBatch
} from "firebase/firestore";

// Helper to generate custom IDs
const generateId = () => Math.random().toString(36).substring(2, 9).toUpperCase();

// Premade aesthetic sport avatar lists representing real-life sporty vibes
const AVATARS = [
  { name: "Kettlebell Master", url: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=150&h=150&q=80" },
  { name: "Calisthenics Pro", url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80" },
  { name: "Yoga Guru", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80" },
  { name: "Running Beast", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80" }
];

export default function App() {
  // Authentication & Profile States
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  // Profile setup wizard parameters
  const [setupName, setSetupName] = useState<string>("");
  const [setupAvatarIndex, setSetupAvatarIndex] = useState<number>(0);
  const [setupTarget, setSetupTarget] = useState<number>(3);
  const [profileSaving, setProfileSaving] = useState<boolean>(false);

  // Group creation/joining variables
  const [partyCodeInput, setPartyCodeInput] = useState<string>("");
  const [newPartyName, setNewPartyName] = useState<string>("");
  const [newPartyCode, setNewPartyCode] = useState<string>("");
  const [seedTeammates, setSeedTeammates] = useState<boolean>(true);
  const [squadSaving, setSquadSaving] = useState<boolean>(false);
  const [squadError, setSquadError] = useState<string>("");

  // Loaded Party components syncing from Firestore
  const [partyDoc, setPartyDoc] = useState<any>(null);
  const [membersMap, setMembersMap] = useState<{ [id: string]: User }>({});
  const [nudgesList, setNudgesList] = useState<ActiveNudge[]>([]);
  const [historyList, setHistoryList] = useState<HistoryEntry[]>([]);

  // Local navigation and layout tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "party" | "social" | "punishments" | "history" | "reminders">("dashboard");
  const [errorMess, setErrorMess] = useState<string>("");

  // AI workout generation form settings
  const [daysCount, setDaysCount] = useState<number>(3);
  const [workoutStyle, setWorkoutStyle] = useState<string>("calisthenics");
  const [fitnessGoals, setFitnessGoals] = useState<string>("overhead stability & handstand skills");
  const [limitationsText, setLimitationsText] = useState<string>("parallettes and floor space only, no heavy squat rack");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);

  // Dynamic dynamic penalty splits outcomes
  const [punishmentOutcome, setPunishmentOutcome] = useState<any>(null);
  const [isCalcingPenalty, setIsCalcingPenalty] = useState<boolean>(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);

  // Custom reminder template simulation notification
  const [popupNotification, setPopupNotification] = useState<{ title: string; message: string; visible: boolean } | null>(null);

  // 1. Listen for standard Authentication states on mount
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Fetch or listen to their profile
        const profileRef = doc(db, "users", user.uid);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          setUserProfile(profileSnap.data() as User);
        } else {
          setUserProfile(null); // Triggers Profile Onboarding flow
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. Set up realtime listeners once the authenticated profile has an active currentPartyId
  useEffect(() => {
    if (!userProfile?.currentPartyId) {
      setPartyDoc(null);
      setMembersMap({});
      setNudgesList([]);
      setHistoryList([]);
      return;
    }

    const partyId = userProfile.currentPartyId;

    // Listen to parent Party settings, routine, and config
    const unsubscribeParty = onSnapshot(doc(db, "parties", partyId), (snap) => {
      if (snap.exists()) {
        setPartyDoc(snap.data());
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `parties/${partyId}`));

    // Listen to actual teammates profiles containing this squad ID
    const qMembers = query(collection(db, "users"), where("currentPartyId", "==", partyId));
    const unsubscribeMembers = onSnapshot(qMembers, (snap) => {
      const uMap: { [id: string]: User } = {};
      snap.forEach(d => {
        uMap[d.id] = d.data() as User;
      });
      setMembersMap(uMap);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users` + ` limit match` + partyId));

    // Listen to real-time micro social nudges sent inside this party
    const qNudges = query(collection(db, "parties", partyId, "nudges"));
    const unsubscribeNudges = onSnapshot(qNudges, (snap) => {
      const arr: ActiveNudge[] = [];
      snap.forEach(d => {
        arr.push(d.data() as ActiveNudge);
      });
      // Sort desc by timestamp
      setNudgesList(arr.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `parties/${partyId}/nudges`));

    // Listen to historical workouts tracked inside this party
    const qHistory = query(collection(db, "parties", partyId, "history"));
    const unsubscribeHistory = onSnapshot(qHistory, (snap) => {
      const arr: HistoryEntry[] = [];
      snap.forEach(d => {
        arr.push(d.data() as HistoryEntry);
      });
      // Sort desc by completedAt
      setHistoryList(arr.sort((a,b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `parties/${partyId}/history`));

    return () => {
      unsubscribeParty();
      unsubscribeMembers();
      unsubscribeNudges();
      unsubscribeHistory();
    };
  }, [userProfile?.currentPartyId]);

  // Hook to automatically recalculate penalties whenever the user's completion rate or party profile lists update
  useEffect(() => {
    if (partyDoc && Object.keys(membersMap).length > 0) {
      triggerPunishmentCalculation();
    }
  }, [partyDoc?.punishmentConfig, membersMap]);

  // 3. Construct virtual standard API PartyState object out of reactive parts
  const partyState: PartyState | null = partyDoc && userProfile ? {
    id: userProfile.currentPartyId,
    name: partyDoc.name,
    users: membersMap,
    activePlan: partyDoc.activePlan || [],
    punishmentConfig: partyDoc.punishmentConfig,
    nudges: nudgesList,
    history: historyList,
    reminderSettings: partyDoc.reminderSettings
  } : null;

  // Active workout stats computations
  const activePlan = partyDoc?.activePlan || [];
  const slackingUsers = (Object.values(membersMap) as User[]).filter(u => u.isSlacking || u.completionRate < 35);

  // Authentication Handlers
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError("Please input an email and password.");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
    } catch (err: any) {
      setAuthError(err.message || "Error logging in. Double check credentials.");
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google login failed:", err);
      if (err?.code === "auth/unauthorized-domain" || String(err?.message || "").includes("unauthorized-domain")) {
        setAuthError("Google Sign-In is restricted here because this preview domain is not whitelisted in the Firebase project's authorized domains. Please register or log in using the simple 'Email & Password' form above - it works out-of-the-box!");
      } else {
        setAuthError(err.message || "Google auth closed or rejected.");
      }
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      setPartyDoc(null);
      setMembersMap({});
      setNudgesList([]);
      setHistoryList([]);
      setAuthMode("login");
    } catch (err) {
      console.error(err);
    }
  };

  // Custom onboarding first profile configurations logger
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim() || !firebaseUser) return;
    setProfileSaving(true);
    try {
      const uId = firebaseUser.uid;
      const avatarUrl = AVATARS[setupAvatarIndex].url;

      const profilePayload: User = {
        id: uId,
        name: setupName,
        email: firebaseUser.email || "",
        avatar: avatarUrl,
        streak: 3, // start with 3 motivational days
        completionRate: 0,
        workoutsCompleted: 0,
        workoutsMissed: 0,
        weeklyTarget: setupTarget,
        isSlacking: false
      };

      await setDoc(doc(db, "users", uId), profilePayload);
      setUserProfile(profilePayload);
    } catch (err) {
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  };

  // Core Seed logic to populate Jordan, Chloe, and Sam in a newly created party
  const seedTeammatesForParty = async (partyId: string) => {
    try {
      const seedUsers: User[] = [
        {
          id: `partner-1-${partyId}`,
          name: "Chloe (The Coach)",
          email: "coach.chloe@squadfit.dev",
          avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80",
          streak: 14,
          completionRate: 100,
          workoutsCompleted: 12,
          workoutsMissed: 0,
          weeklyTarget: 5,
          isSlacking: false,
          currentPartyId: partyId
        } as any,
        {
          id: `partner-2-${partyId}`,
          name: "Jordan (The Machine)",
          email: "jordan.lifts@squadfit.dev",
          avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&h=150&q=80",
          streak: 8,
          completionRate: 75,
          workoutsCompleted: 9,
          workoutsMissed: 2,
          weeklyTarget: 4,
          isSlacking: false,
          currentPartyId: partyId
        } as any,
        {
          id: `partner-3-${partyId}`,
          name: "Sam (The Slacker)",
          email: "sam.couch@squadfit.dev",
          avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80",
          streak: 0,
          completionRate: 20,
          workoutsCompleted: 1,
          workoutsMissed: 6,
          weeklyTarget: 3,
          isSlacking: true,
          currentPartyId: partyId
        } as any
      ];

      const batch = writeBatch(db);
      for (const t of seedUsers) {
        batch.set(doc(db, "users", t.id), t);
        batch.set(doc(db, "parties", partyId, "members", t.id), {
          userId: t.id,
          joinedAt: new Date().toISOString(),
          role: "member"
        });
      }
      await batch.commit();

      // Seed a pleasant introductory conversational welcome message
      const welcomeNudge: ActiveNudge = {
        id: "nudge-welcome",
        fromUser: `partner-1-${partyId}`,
        toUser: firebaseUser.uid,
        message: "Welcome to the squad! Let's get down to calisthenics or heavy lifts. Check your checklist or generate a new AI routine custom to your goals!",
        channel: "chat",
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, "parties", partyId, "nudges"), welcomeNudge);
    } catch (err) {
      console.error("Partner seed calculation crash: ", err);
    }
  };

  // Onboarding Group Operations (Create, Join, Sandbox)
  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartyName.trim() || !userProfile) return;
    setSquadSaving(true);
    setSquadError("");
    try {
      const code = (newPartyCode.trim() || generateId()).substring(0, 10).toUpperCase();

      // Check if squad code already taken
      const existsQuery = query(collection(db, "parties"), where("code", "==", code));
      const querySnap = await getDocs(existsQuery);
      if (!querySnap.empty) {
        throw new Error(`The squad authorization code '${code}' is already reserved. Input a custom code.`);
      }

      const partyId = "squad-" + generateId().toLowerCase();
      
      const defaultActivePlan: DayWorkout[] = [
        {
          dayName: "Monday (Day 1)",
          focus: "Calisthenics Push Mastery: Chest, Delts & Triceps Focus",
          exercises: [
            { id: "e1", name: "Pike Pushups (Shoulder elevation)", sets: 3, reps: "8-10 reps", rest: "90 seconds", completedBy: {} },
            { id: "e2", name: "Weighted Chest Dips", sets: 4, reps: "6-8 reps", rest: "2 mins", completedBy: {} },
            { id: "e3", name: "Diamond Pushups (Triceps burnout)", sets: 3, reps: "15 reps", rest: "60 seconds", completedBy: {} }
          ]
        },
        {
          dayName: "Wednesday (Day 2)",
          focus: "Calisthenics Pull Foundations: Lats & Grip strength",
          exercises: [
            { id: "e4", name: "Dead-hang Pullups", sets: 4, reps: "8-12 reps", rest: "90 seconds", completedBy: {} },
            { id: "e5", name: "Parallette Inverted Body Rows", sets: 3, reps: "10-12 reps", rest: "60 seconds", completedBy: {} },
            { id: "e6", name: "Scapula pull down shrugging", sets: 3, reps: "15 reps", rest: "60 seconds", completedBy: {} }
          ]
        }
      ];

      const newPartyDoc = {
        id: partyId,
        name: newPartyName,
        code,
        ownerId: userProfile.id,
        createdAt: new Date().toISOString(),
        punishmentConfig: {
          model: "scaled-percentage" as any,
          flatRateAmount: 10,
          weeklyPayloadPool: "400 Penalty Burpees total"
        },
        reminderSettings: {
          morningEnabled: true,
          morningTime: "08:00 AM",
          midDayEnabled: true,
          midDayTime: "01:00 PM",
          nightEnabled: true,
          nightTime: "09:00 PM",
          customMessageTemplate: "🚨 {USER}, lock in today's workout! Focus: {FOCUS}. Streak: {STREAK} days!"
        },
        activePlan: defaultActivePlan
      };

      // Save party document
      await setDoc(doc(db, "parties", partyId), newPartyDoc);

      // Save squad members bridge entry
      await setDoc(doc(db, "parties", partyId, "members", userProfile.id), {
        userId: userProfile.id,
        joinedAt: new Date().toISOString(),
        role: "owner"
      });

      // Optionally seed 3 AI companions
      if (seedTeammates) {
        await seedTeammatesForParty(partyId);
      }

      // Update current user's profile squad reference
      const userRef = doc(db, "users", userProfile.id);
      await updateDoc(userRef, { currentPartyId: partyId });
      setUserProfile(prev => prev ? { ...prev, currentPartyId: partyId } : null);
    } catch (err: any) {
      setSquadError(err.message || "Could not bootstrap new squad.");
      console.error(err);
    } finally {
      setSquadSaving(false);
    }
  };

  const handleJoinSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyCodeInput.trim() || !userProfile) return;
    setSquadSaving(true);
    setSquadError("");
    try {
      const code = partyCodeInput.trim().toUpperCase();
      const qState = query(collection(db, "parties"), where("code", "==", code));
      const querySnap = await getDocs(qState);
      if (querySnap.empty) {
        throw new Error("Invalid Code. There is no active fitness squad registered with this code.");
      }

      const partyDocData = querySnap.docs[0].data();
      const partyId = partyDocData.id;

      // Add to member subcollection
      await setDoc(doc(db, "parties", partyId, "members", userProfile.id), {
        userId: userProfile.id,
        joinedAt: new Date().toISOString(),
        role: "member"
      });

      // Update user document
      const userRef = doc(db, "users", userProfile.id);
      await updateDoc(userRef, { currentPartyId: partyId });
      setUserProfile(prev => prev ? { ...prev, currentPartyId: partyId } : null);
    } catch (err: any) {
      setSquadError(err.message || "Join failed.");
    } finally {
      setSquadSaving(false);
    }
  };

  // Dynamic public sandbox preset launcher for frictionless testing
  const handleLaunchSandbox = async () => {
    if (!userProfile) return;
    setSquadSaving(true);
    setSquadError("");
    try {
      const partyId = "party-champs";
      const partyRef = doc(db, "parties", partyId);
      const snap = await getDoc(partyRef);

      const defaultActivePlan: DayWorkout[] = [
        {
          dayName: "Monday (Day 1)",
          focus: "Calisthenics Push Mastery: Chest, Delts & Triceps Focus",
          exercises: [
            { id: "e1", name: "Pike Pushups (Shoulder elevation)", sets: 3, reps: "8-10 reps", rest: "90 seconds", completedBy: {} },
            { id: "e2", name: "Weighted Chest Dips", sets: 4, reps: "6-8 reps", rest: "2 mins", completedBy: {} },
            { id: "e3", name: "Diamond Pushups (Triceps burnout)", sets: 3, reps: "15 reps", rest: "60 seconds", completedBy: {} }
          ]
        },
        {
          dayName: "Wednesday (Day 2)",
          focus: "Calisthenics Pull Foundations: Lats & Grip strength",
          exercises: [
            { id: "e4", name: "Dead-hang Pullups", sets: 4, reps: "8-12 reps", rest: "90 seconds", completedBy: {} },
            { id: "e5", name: "Parallette Inverted Body Rows", sets: 3, reps: "10-12 reps", rest: "60 seconds", completedBy: {} },
            { id: "e6", name: "Scapula pull down shrugging", sets: 3, reps: "15 reps", rest: "60 seconds", completedBy: {} }
          ]
        }
      ];

      if (!snap.exists()) {
        const payload = {
          id: partyId,
          name: "Omega-Core Calisthenics",
          code: "CHAMPS",
          ownerId: "system",
          createdAt: new Date().toISOString(),
          punishmentConfig: {
            model: "scaled-percentage" as any,
            flatRateAmount: 10,
            weeklyPayloadPool: "400 Penalty Burpees total"
          },
          reminderSettings: {
            morningEnabled: true,
            morningTime: "08:00 AM",
            midDayEnabled: true,
            midDayTime: "01:00 PM",
            nightEnabled: true,
            nightTime: "09:00 PM",
            customMessageTemplate: "🚨 {USER}, lock in today's workout! Focus: {FOCUS}. Streak: {STREAK} days!"
          },
          activePlan: defaultActivePlan
        };
        await setDoc(partyRef, payload);
      }

      await setDoc(doc(db, "parties", partyId, "members", userProfile.id), {
        userId: userProfile.id,
        joinedAt: new Date().toISOString(),
        role: "member"
      });

      await seedTeammatesForParty(partyId);

      const userRef = doc(db, "users", userProfile.id);
      await updateDoc(userRef, { currentPartyId: partyId });
      setUserProfile(prev => prev ? { ...prev, currentPartyId: partyId } : null);
    } catch (err: any) {
      setSquadError(err.message || "Failed launching sandbox.");
    } finally {
      setSquadSaving(false);
    }
  };

  // Leave active squad and clear references
  const handleLeaveSquad = async () => {
    if (!userProfile) return;
    if (!window.confirm("Are you sure you want to exit your current training squad?")) return;
    try {
      const userRef = doc(db, "users", userProfile.id);
      await updateDoc(userRef, { currentPartyId: "" });
      setUserProfile(prev => prev ? { ...prev, currentPartyId: "" } : null);
    } catch (err) {
      console.error(err);
    }
  };

  // Stateful updates proxied/computed
  const triggerPunishmentCalculation = async () => {
    if (!partyDoc) return;
    setIsCalcingPenalty(true);
    try {
      const resp = await fetch("/api/party/punishment/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          punishmentConfig: partyDoc.punishmentConfig,
          users: membersMap
        })
      });
      const data = await resp.json();
      if (data.status === "success") {
        setPunishmentOutcome(data);
      }
    } catch (err) {
      console.error("Penalty stats compiler failed: ", err);
    } finally {
      setIsCalcingPenalty(false);
    }
  };

  const handleToggleExercise = async (exerciseId: string, completed: boolean) => {
    if (!userProfile?.currentPartyId) return;

    // Build plan updates
    const updatedPlan = activePlan.map((day: any) => {
      return {
        ...day,
        exercises: day.exercises.map((ex: any) => {
          if (ex.id === exerciseId) {
            const completedBy = { ...ex.completedBy };
            if (completed) {
              completedBy[userProfile.id] = true;
            } else {
              delete completedBy[userProfile.id];
            }
            return { ...ex, completedBy };
          }
          return ex;
        })
      };
    });

    let totalExercisesCount = 0;
    let completedExercisesCount = 0;
    updatedPlan.forEach((day: any) => {
      day.exercises.forEach((ex: any) => {
        totalExercisesCount++;
        if (ex.completedBy[userProfile.id]) {
          completedExercisesCount++;
        }
      });
    });

    const completionRate = totalExercisesCount > 0 ? Math.round((completedExercisesCount / totalExercisesCount) * 100) : 0;
    let streak = userProfile.streak || 0;
    let isSlacking = userProfile.isSlacking || false;

    if (completionRate > 80) {
      streak = Math.max(streak, 3) + 1;
      isSlacking = false;
    } else if (completionRate < 35) {
      isSlacking = true;
    }

    try {
      // 1. Update party active Plan array in Firestore
      const partyRef = doc(db, "parties", userProfile.currentPartyId);
      await updateDoc(partyRef, { activePlan: updatedPlan });

      // 2. Update user profile stats in Firestore
      const userRef = doc(db, "users", userProfile.id);
      await updateDoc(userRef, {
        completionRate,
        streak,
        isSlacking,
        workoutsCompleted: completedExercisesCount,
        workoutsMissed: Math.max(0, totalExercisesCount - completedExercisesCount)
      });

      // Quick visual feedback update
      setUserProfile(prev => prev ? {
        ...prev,
        completionRate,
        streak,
        isSlacking,
        workoutsCompleted: completedExercisesCount,
        workoutsMissed: Math.max(0, totalExercisesCount - completedExercisesCount)
      } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `parties/${userProfile.currentPartyId}`);
    }
  };

  const handleManualEdit = async (exerciseId: string, name: string, sets: number, reps: string, rest: string) => {
    if (!userProfile?.currentPartyId) return;
    const updatedPlan = activePlan.map((day: any) => {
      return {
        ...day,
        exercises: day.exercises.map((ex: any) => {
          if (ex.id === exerciseId) {
            return { ...ex, name, sets, reps, rest };
          }
          return ex;
        })
      };
    });

    try {
      const partyRef = doc(db, "parties", userProfile.currentPartyId);
      await updateDoc(partyRef, { activePlan: updatedPlan });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `parties/${userProfile.currentPartyId}`);
    }
  };

  const handleAIConversationalEdit = async (whisper: string) => {
    if (!userProfile?.currentPartyId) return;
    try {
      const resp = await fetch("/api/workout/conversational-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whisperInput: whisper, currentPlan: activePlan })
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || "Conversational editor failed.");
      }
      if (data.status === "success" && data.plan) {
        const partyRef = doc(db, "parties", userProfile.currentPartyId);
        await updateDoc(partyRef, { activePlan: data.plan });
      }
    } catch (err: any) {
      throw new Error(err.message || "Conversational update timeout.");
    }
  };

  const handleUpdateReminderSettings = async (newSettings: Partial<ReminderSettings>) => {
    if (!userProfile?.currentPartyId || !partyDoc) return;
    try {
      const partyRef = doc(db, "parties", userProfile.currentPartyId);
      await updateDoc(partyRef, {
        reminderSettings: {
          ...partyDoc.reminderSettings,
          ...newSettings
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `parties/${userProfile.currentPartyId}`);
    }
  };

  const handleGenerateAISchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.currentPartyId) return;
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
        const partyRef = doc(db, "parties", userProfile.currentPartyId);
        await updateDoc(partyRef, { activePlan: data.plan });

        // Reset all teammate completion scores inside this party to zero for new routine
        const qMembersSnap = await getDocs(query(collection(db, "users"), where("currentPartyId", "==", userProfile.currentPartyId)));
        const batch = writeBatch(db);
        qMembersSnap.forEach(d => {
          batch.update(d.ref, {
            completionRate: 0,
            workoutsCompleted: 0,
            workoutsMissed: 0
          });
        });
        await batch.commit();

        setActiveTab("dashboard");
      } else {
        alert(data.error || "AI program compilation failed.");
      }
    } catch (err: any) {
      alert(err.message || "Operation failed. Make sure your local setup is linked with Gemini.");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleNudgeFriend = async (targetUserId: string): Promise<ActiveNudge | null> => {
    if (!userProfile?.currentPartyId) return null;
    const target = membersMap[targetUserId];
    if (!target) return null;

    try {
      const resp = await fetch("/api/party/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUser: userProfile,
          toUser: target
        })
      });
      const data = await resp.json();
      if (data.status === "success" && data.nudge) {
        // Save nudge log directly to Firestore subcollection
        await addDoc(collection(db, "parties", userProfile.currentPartyId, "nudges"), data.nudge);
        return data.nudge;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const handleLogWorkoutToHistory = async (workoutTitle: string, workoutType: string, exercises: any[]) => {
    if (!userProfile?.currentPartyId) return;

    const log: HistoryEntry = {
      id: "hist-" + generateId().toLowerCase(),
      userId: userProfile.id,
      userName: userProfile.name,
      userAvatar: userProfile.avatar,
      workoutTitle,
      workoutType,
      completedAt: new Date().toISOString(),
      exercises: exercises.map((ex: any) => ({
        name: ex.name,
        sets: Number(ex.sets) || 3,
        reps: String(ex.reps || "10 reps")
      }))
    };

    try {
      await addDoc(collection(db, "parties", userProfile.currentPartyId, "history"), log);

      // Boost stats
      const userRef = doc(db, "users", userProfile.id);
      await updateDoc(userRef, {
        workoutsCompleted: (userProfile.workoutsCompleted || 0) + 1,
        streak: (userProfile.streak || 0) + 1,
        isSlacking: false,
        completionRate: Math.min(100, (userProfile.completionRate || 0) + 15)
      });

      setUserProfile(prev => prev ? {
        ...prev,
        workoutsCompleted: (prev.workoutsCompleted || 0) + 1,
        streak: (prev.streak || 0) + 1,
        isSlacking: false,
        completionRate: Math.min(100, (prev.completionRate || 0) + 15)
      } : null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfigPunishment = async (model: string, amount: number, pool: string) => {
    if (!userProfile?.currentPartyId) return;
    try {
      const partyRef = doc(db, "parties", userProfile.currentPartyId);
      await updateDoc(partyRef, {
        punishmentConfig: {
          model,
          flatRateAmount: amount,
          weeklyPayloadPool: pool
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `parties/${userProfile.currentPartyId}`);
    }
  };

  // Live trigger dynamic unlock-screen notification test on client layout
  const handleTestNotificationTime = async (timeOfDay: string) => {
    if (!userProfile || !partyDoc) return;
    try {
      const resp = await fetch("/api/reminders/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: userProfile,
          activePlan: activePlan,
          reminderSettings: partyDoc.reminderSettings,
          punishmentConfig: partyDoc.punishmentConfig,
          timeOfDay
        })
      });
      const data = await resp.json();
      if (data.status === "success") {
        setPopupNotification({
          title: data.title,
          message: data.message,
          visible: true
        });
        // Auto-dismiss in 10s
        setTimeout(() => setPopupNotification(null), 10000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Loading Splash Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col items-center justify-center text-slate-300 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00FF95] border-t-transparent rounded-full animate-spin" />
          <p className="font-display font-extrabold text-[#00FF95] tracking-widest text-lg">SQUADFIT CORE</p>
          <span className="text-xs text-slate-500 font-mono">Synchronizing state indices...</span>
        </div>
      </div>
    );
  }

  // Visual View A: User not logged in -> Beautiful Neon Sign-up / Login screen
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glow details */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-[#111215]/90 border border-slate-800/85 p-8 rounded-2xl shadow-2xl relative">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-3">
              <Dumbbell className="w-8 h-8 text-[#00FF95] animate-pulse" />
            </div>
            <h1 className="text-3xl font-display font-black text-white tracking-widest uppercase">SQUADFIT</h1>
            <p className="text-xs text-slate-400 font-mono tracking-wider mt-1.5 uppercase">Cooperative Streak & Slacking Penalties Engine</p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-950 border border-slate-800/80 focus:border-emerald-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800/80 focus:border-emerald-500 rounded-xl px-4 py-3 text-slate-200 text-sm outline-none transition-colors"
                />
              </div>
            </div>

            {authError && (
              <div className="text-rose-400 font-mono text-xs bg-rose-950/20 border border-rose-950 p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-[#00FF95] hover:bg-emerald-400 text-[#0c131a] font-extrabold text-sm py-3.5 rounded-xl transition-all shadow-lg shadow-[#00ff951a] cursor-pointer"
            >
              {authMode === "login" ? "Log In to Squad" : "Sign Up & Start Training"}
            </button>
          </form>

          <div className="relative my-6 text-center">
            <span className="bg-[#111215] px-3 text-xs text-slate-500 font-mono relative z-10">OR</span>
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-800" />
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-3 px-4 rounded-xl border border-slate-800 flex items-center justify-center gap-2 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C18.155 2.185 15.421 1 12.24 1c-6.077 0-11 4.923-11 11s4.923 11 11 11c6.347 0 10.554-4.46 10.554-10.74 0-.726-.077-1.282-.176-1.685H12.24z"/>
            </svg>
            Sign In with Google
          </button>

          <div className="text-center mt-6">
            <button
              onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
              className="text-xs text-emerald-400 hover:underline font-semibold"
            >
              {authMode === "login" ? "Don't have a squad yet? Sign up here" : "Already registered? Let's log in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Visual View B: Authenticated but profile document missing -> Step 1 Profile Wizard
  if (!userProfile) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="w-full max-w-md bg-[#111215] border border-slate-800 p-8 rounded-2xl relative shadow-2xl">
          <div className="mb-6">
            <span className="text-[#00FF95] font-mono text-[10px] uppercase font-bold tracking-widest block mb-1">Step 1 of 2</span>
            <h2 className="text-2xl font-display font-extrabold text-white flex items-center gap-2">
              <UserCheck className="text-[#00FF95] w-6 h-6" /> Profile Registration
            </h2>
            <p className="text-xs text-slate-400 mt-1">Configure your human trainee details to activate the workout log.</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Trainee Nickname</label>
              <input
                type="text"
                required
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="e.g., Ariel 'The Iron'"
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-3 text-white text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Select Visual Trainee Avatar</label>
              <div className="grid grid-cols-4 gap-2">
                {AVATARS.map((av, idx) => {
                  const isSelected = setupAvatarIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSetupAvatarIndex(idx)}
                      className={`relative p-1 rounded-xl border transition-all ${
                        isSelected ? "border-[#00FF95] bg-[#00ff950a] scale-105" : "border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <img src={av.url} alt={av.name} className="w-full h-12 rounded-lg object-cover" />
                      {isSelected && <div className="absolute top-0 right-0 -m-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#111215] text-[7px] text-black">✓</div>}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-slate-500 mt-1.5 block">Used to rank your profile on the live squad leaderboard.</span>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5 col-span-3">Weekly Target Workout Days</label>
              <select
                value={setupTarget}
                onChange={(e) => setSetupTarget(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-3 text-white text-sm outline-none font-mono"
              >
                <option value={3}>3 Days/Week (Maintain Strength)</option>
                <option value={4}>4 Days/Week (Active Growth)</option>
                <option value={5}>5 Days/Week (High Performance Warrior)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full bg-[#00FF95] hover:bg-[#00FF95]/90 disabled:opacity-50 text-[#0c131a] font-extrabold text-sm py-3.5 rounded-xl shadow-lg cursor-pointer"
            >
              {profileSaving ? "Saving Metrics..." : "Create Account & Proceed"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Visual View C: Registered but has no currentPartyId -> Step 2 Group Selection Center
  if (!userProfile.currentPartyId) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-2xl bg-[#111215] border border-slate-800 p-8 rounded-2xl relative shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
            <div>
              <span className="text-[#00FF95] font-mono text-[10px] uppercase font-bold tracking-widest block mb-1">Step 2 of 2</span>
              <h2 className="text-3xl font-display font-extrabold text-white">Squad Activation Center</h2>
              <p className="text-xs text-slate-400 mt-1">Hello {userProfile.name}! Join or design your training group workout party.</p>
            </div>
            <button onClick={handleSignOut} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-xs font-bold">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

          {squadError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs p-3.5 rounded-xl flex items-center gap-2 mb-6">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{squadError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box L: Join Squad */}
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-900 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#00FF95]" /> Join Existing Squad
                </h3>
                <p className="text-xs text-slate-400 mb-4">Enter your comrades' 6-letter invite code to sync active routines.</p>
              </div>

              <form onSubmit={handleJoinSquad} className="space-y-3">
                <input
                  type="text"
                  required
                  value={partyCodeInput}
                  onChange={(e) => setPartyCodeInput(e.target.value)}
                  placeholder="Invite Code (e.g. SQUAD1)"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-2.5 text-white font-mono text-center text-sm outline-none"
                />
                <button
                  type="submit"
                  disabled={squadSaving}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  Join Training Squad
                </button>
              </form>
            </div>

            {/* Box R: Create Squad */}
            <div className="p-5 bg-slate-950 rounded-xl border border-slate-900 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-[#00FF95]" /> Build New Fitness Squad
                </h3>
                <p className="text-xs text-slate-400 mb-4">Create your own workout party with customized rules and penalty configurations.</p>
              </div>

              <form onSubmit={handleCreateSquad} className="space-y-3">
                <input
                  type="text"
                  required
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Squad Name (e.g., Office Pullups)"
                  className="w-full bg-slate-900 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-2.5 text-slate-200 text-sm outline-none"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newPartyCode}
                    onChange={(e) => setNewPartyCode(e.target.value)}
                    placeholder="Custom Invite Code (Optional)"
                    className="w-full bg-slate-900 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-2 text-slate-200 text-xs font-mono outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 py-1 select-none">
                  <input
                    type="checkbox"
                    id="seed-teammates"
                    checked={seedTeammates}
                    onChange={(e) => setSeedTeammates(e.target.checked)}
                    className="accent-emerald-500 rounded font-mono"
                  />
                  <label htmlFor="seed-teammates" className="text-[11px] text-slate-400 font-mono font-medium cursor-pointer">
                    Seed 3 funny AI Partners to test the social features
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={squadSaving}
                  className="w-full bg-[#00FF95] hover:bg-emerald-400 text-black font-extrabold text-xs py-2.5 rounded-xl transition cursor-pointer"
                >
                  Create & Launch Squad
                </button>
              </form>
            </div>
          </div>

          {/* Quick sandbox portal for easy evaluator run */}
          <div className="mt-8 border-t border-slate-800/80 pt-6 text-center">
            <p className="text-xs text-slate-400 mb-3 font-mono">Just testing? Get instant access using preconfigured database sandboxes:</p>
            <button
              onClick={handleLaunchSandbox}
              disabled={squadSaving}
              className="bg-[#00FF95]/10 hover:bg-[#00FF95]/20 text-[#00FF95] border border-[#00ff9533] px-6 py-3 rounded-xl font-bold font-display text-xs inline-flex items-center gap-2 cursor-pointer transition active:scale-95 shadow-md"
            >
              <Sparkles className="w-4 h-4 animate-pulse text-[#00FF95]" />
              Join Sandbox Demo Squad (Real-time AI Enabled)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Visual View D: Loaded Core Application state dashboard
  return (
    <div id="app-container" className="min-h-screen flex bg-[#0A0A0B] text-[#E0E0E0] font-sans pb-20 md:pb-0">
      
      {/* 1. SIDEBAR - STRICT ADHERENCE TO IMMERSIVE DESIGN THEME (Hidden on Mobile) */}
      <aside id="sidebar" className="hidden md:flex w-[240px] shrink-0 border-r border-[#ffffff14] bg-[#0f1012cc] flex-col p-6 justify-between self-stretch sticky top-0 h-screen overflow-y-auto">
        <div className="flex flex-col">
          {/* Neon Branded Logo */}
          <div className="logo mb-10 text-2xl font-black text-[#00FF95] tracking-tighter cursor-pointer flex items-center gap-2 select-none" onClick={triggerPunishmentCalculation}>
            <div className="w-3 h-3 bg-[#00FF95] rounded-full animate-ping mr-1" />
            <span className="glow-text tracking-widest uppercase font-display">SQUADFIT</span>
          </div>

          {/* Nav items */}
          <div className="space-y-1.5">
            <button
              id="nav-btn-dashboard"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left cursor-pointer ${
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
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left cursor-pointer ${
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
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left cursor-pointer ${
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
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left cursor-pointer ${
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
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left cursor-pointer ${
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
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left cursor-pointer ${
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
          <div className="penalty-box bg-[#ff44441a] border border-[#ff44444d] p-4 rounded-xl flex flex-col gap-1.5">
            <div className="penalty-title text-[#FF4444] font-mono text-[10px] uppercase font-bold tracking-widest flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Active Penalties Target
            </div>
            <div className="text-xs font-semibold text-rose-100 flex items-center justify-between gap-1">
              <span>{partyDoc?.punishmentConfig.weeklyPayloadPool || "400 burpees or $40"}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-1">
              Configured: <span className="text-rose-400 capitalize font-bold">{partyDoc?.punishmentConfig.model.replace('-', ' ')}</span>
            </div>
          </div>

          <button
            onClick={handleLeaveSquad}
            className="text-[10px] uppercase font-mono text-slate-500 hover:text-rose-400 transition flex items-center gap-1.5 justify-center py-2 rounded bg-slate-950 border border-slate-900 cursor-pointer"
            title="Disconnect from current workout party"
          >
            ← Exit Squad
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER & BOTTOM NAV BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0E0F12] border-t border-slate-800 z-40 flex items-center justify-around px-2">
        <button onClick={() => setActiveTab("dashboard")} className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "dashboard" ? "text-[#00FF95]" : "text-slate-500"}`}>
          <Dumbbell className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-mono">Log</span>
        </button>
        <button onClick={() => setActiveTab("party")} className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "party" ? "text-[#00FF95]" : "text-slate-500"}`}>
          <Users className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-mono">Routine</span>
        </button>
        <button onClick={() => setActiveTab("social")} className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "social" ? "text-[#00FF95]" : "text-slate-500"}`}>
          <Award className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-mono">Ladder</span>
        </button>
        <button onClick={() => setActiveTab("punishments")} className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "punishments" ? "text-[#00FF95]" : "text-slate-500"}`}>
          <Skull className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-mono">Fees</span>
        </button>
        <button onClick={() => setActiveTab("history")} className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "history" ? "text-[#00FF95]" : "text-slate-500"}`}>
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-mono">Logs</span>
        </button>
      </div>

      {/* MAIN VIEW CONTROLLER */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        
        {/* TOP STATUS BAR BAR */}
        <header className="border-b border-slate-800/80 bg-[#0c0d10aa] px-6 py-4 flex items-center justify-between sticky top-0 backdrop-blur-md z-30">
          <div className="flex items-center gap-2">
            <span className="text-white text-base font-display font-extrabold flex items-center gap-2">
              🏆 {partyDoc?.name || "Active Squad"}
            </span>
            <span className="bg-slate-800 text-[10.5px] font-mono text-emerald-400 px-3 py-1 rounded-md border border-slate-700/50">
              Invite Code: <span className="font-bold underline">{partyDoc?.code}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Profile Info */}
            <div className="flex items-center gap-2.5 bg-slate-900/60 p-1.5 pr-3 rounded-xl border border-slate-800">
              <img src={userProfile.avatar} alt={userProfile.name} className="w-7 h-7 rounded-lg object-cover border border-slate-800" />
              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">{userProfile.name}</p>
                <p className="text-[9px] text-[#00FF95] font-mono mt-0.5 uppercase tracking-wide">
                  🔥 Streak: {userProfile.streak}w
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800/80 text-slate-400 hover:text-white transition border border-slate-800 cursor-pointer"
              title="Sign Out auth account"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* CONTAINER CONTENT */}
        <div className="p-6 flex-1 space-y-6 max-w-7xl mx-auto w-full">
          
          {/* Active Slacker emergency notification banner */}
          <AnimatePresence>
            {slackingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl">
                    <Skull className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">SQUAD SLACKING EMERGENCY RESOLVED</h4>
                    <p className="text-xs text-rose-300 mt-0.5 font-mono">
                      {slackingUsers.length} teammates are currently overdue below 35% completion! Target fees and burpees are building up!
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("punishments")}
                  className="bg-rose-500 hover:bg-rose-400 text-[#0c131a] font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shrink-0"
                >
                  Configure Split Penances
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab Views */}
          {activeTab === "dashboard" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <WorkoutPlanner
                  activePlan={activePlan}
                  currentUser={userProfile}
                  users={membersMap}
                  onToggleExercise={handleToggleExercise}
                  onManualEdit={handleManualEdit}
                  onAIConversationalEdit={handleAIConversationalEdit}
                  onLogWorkoutToHistory={handleLogWorkoutToHistory}
                />
              </div>
              <div className="space-y-6">
                <ActivityLeaderboard
                  users={membersMap}
                  currentUser={userProfile}
                  nudges={nudgesList}
                  onNudge={handleNudgeFriend}
                />
              </div>
            </div>
          )}

          {activeTab === "party" && (
            <div id="ai-planner-view" className="bg-[#111215]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ff950a] rounded-full blur-3xl pointer-events-none" />

              <div className="border-b border-slate-800 pb-4 mb-6">
                <span className="bg-emerald-500/10 text-[#00FF95] text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider font-mono">
                  Co-operative Scheduler
                </span>
                <h2 className="text-2xl font-display font-black text-white mt-2 flex items-center gap-2">
                  <Sparkles className="text-[#00FF95] w-6 h-6 animate-pulse" /> Gemini AI Workout Compiler
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Input training constraints to draft and commit a new multi-day program cycle for the entire squad.
                </p>
              </div>

              <form onSubmit={handleGenerateAISchedule} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Weekly Cycle training Days</label>
                    <select
                      value={daysCount}
                      onChange={(e) => setDaysCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-3 text-white text-sm outline-none font-mono"
                    >
                      <option value={2}>2 active Training Days / week</option>
                      <option value={3}>3 active Training Days / week</option>
                      <option value={4}>4 active Training Days / week</option>
                      <option value={5}>5 active Training Days / week</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Training Philosophy</label>
                    <input
                      type="text"
                      value={workoutStyle}
                      onChange={(e) => setWorkoutStyle(e.target.value)}
                      placeholder="e.g. Calisthenics skill training, kettlebells, powerlifting"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-3 text-slate-200 text-sm outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Target Specific Goals & Milestones</label>
                  <input
                    type="text"
                    value={fitnessGoals}
                    onChange={(e) => setFitnessGoals(e.target.value)}
                    placeholder="e.g. deadlift 2x bodyweight, pike pushups strength, core compressions"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-3 text-slate-200 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Trainee limitations & Equipment configs</label>
                  <input
                    type="text"
                    value={limitationsText}
                    onChange={(e) => setLimitationsText(e.target.value)}
                    placeholder="e.g. no fancy barbells, parallettes and pull-up bar setup only"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-3 text-slate-200 text-sm outline-none"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={isGeneratingPlan}
                    className="bg-[#00FF95] hover:bg-emerald-400 disabled:opacity-50 text-black font-extrabold text-sm px-6 py-3.5 rounded-xl transition shadow-lg shadow-[#00ff951a] flex items-center gap-2 cursor-pointer"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating Routine Program...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Draft & Commit Squad Schedule
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "social" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ActivityLeaderboard
                users={membersMap}
                currentUser={userProfile}
                nudges={nudgesList}
                onNudge={handleNudgeFriend}
              />
              {/* Additional cool active feeds logs widget */}
              <div className="bg-[#111215]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shrink-0 relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <span className="text-[#00FF95] font-mono text-[10px] uppercase font-bold tracking-widest block mb-1">Squad accountability logs</span>
                  <h3 className="text-xl font-display font-extrabold text-white">Interactive accountability channels</h3>
                  <p className="text-xs text-slate-400 mt-1 mb-6">
                    Real-time logs showing notifications and motivator roasts generated inside your active workout squad!
                  </p>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {nudgesList.map((n, i) => {
                      const s = membersMap[n.fromUser] || { name: "Chloe (Coach)" };
                      const t = membersMap[n.toUser] || { name: " التزام" };
                      return (
                        <div key={i} className="p-3 bg-slate-950/60 rounded-xl border border-slate-900/80 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-emerald-400 font-mono text-[10px] uppercase bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/10">
                              🔥 SQUAD nudges
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-300">
                            <strong>{s.name}</strong> nudged/roasted <strong>{t.name}</strong>: "{n.message}"
                          </p>
                        </div>
                      );
                    })}
                    {nudgesList.length === 0 && (
                      <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        No accountability logs yet. Roast a slacking friend on the active dashboard to compile lists!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "punishments" && (
            <div className="space-y-6">
              {/* Box A: Punishment Configurations */}
              <div className="bg-[#111215]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="border-b border-slate-800 pb-4 mb-6">
                  <span className="bg-rose-500/10 text-rose-400 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider font-mono">
                    Financial & Penance rules
                  </span>
                  <h2 className="text-2xl font-display font-black text-white mt-1.5 flex items-center gap-2">
                    <Skull className="text-rose-500 w-5 h-5" /> Penalty Configurations
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Penalties Allocation Scheme</label>
                      <select
                        value={partyDoc?.punishmentConfig.model}
                        onChange={(e) => handleConfigPunishment(e.target.value as any, partyDoc?.punishmentConfig.flatRateAmount || 10, partyDoc?.punishmentConfig.weeklyPayloadPool || "300 burpees")}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-3 text-white text-sm outline-none font-mono"
                      >
                        <option value="scaled-percentage">Scaled Ratio (Split total relative to missed workouts)</option>
                        <option value="flat-rate">Flat Rate Price Penalty ($5 or $10 individual fine/drill per miss)</option>
                        <option value="workout-geared">Dynamic Penance Card (AI generated severe workouts split)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Flat Miss Penalty ($)</label>
                        <input
                          type="number"
                          value={partyDoc?.punishmentConfig.flatRateAmount || 10}
                          onChange={(e) => handleConfigPunishment(partyDoc?.punishmentConfig.model || "scaled-percentage", Number(e.target.value), partyDoc?.punishmentConfig.weeklyPayloadPool || "300 Penalty burpees")}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">Group Penance target</label>
                        <input
                          type="text"
                          value={partyDoc?.punishmentConfig.weeklyPayloadPool || "400 burpees or $40 group penalty"}
                          onChange={(e) => handleConfigPunishment(partyDoc?.punishmentConfig.model || "scaled-percentage", partyDoc?.punishmentConfig.flatRateAmount || 10, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-5 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-mono uppercase text-slate-400 mb-1">How penalties keep squads active:</h4>
                      <p className="text-xs text-slate-400 leading-relaxed mt-2">
                        If a teammate's checkboxes are unchecked by Sunday night, the system tracks their completed ratio. All missed daily workouts trigger proportional splits or flat rate fees inside your squad fund! No excuses!
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center justify-end mt-4">✓ Reactive calculations enabled</span>
                  </div>
                </div>
              </div>

              {/* Box B: Penalties Calculation Dashboard widget */}
              <div className="bg-[#111215]/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
                      <Coins className="text-amber-500 w-5 h-5" /> Reactive Penalties Compilation Panel
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Compiled calculations based on active slacker records.</p>
                  </div>
                  <button
                    onClick={triggerPunishmentCalculation}
                    disabled={isCalcingPenalty}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 cursor-pointer text-xs flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCalcingPenalty ? "animate-spin" : ""}`} /> Recalculate Now
                  </button>
                </div>

                {punishmentOutcome ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Ratio Splits */}
                    <div className="bg-slate-950/40 border border-slate-900/80 rounded-xl p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-rose-400 mb-3 font-bold">Scaled Penalty Split (Ratio-Based)</p>
                      <div className="space-y-2">
                        {punishmentOutcome.scaledSplit?.map((item: any) => (
                          <div key={item.userId} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-900 last:border-0">
                            <span className="text-slate-300 font-medium">{item.name}</span>
                            <span className="font-mono text-rose-300">{item.penaltyShare} ({item.missedCount} misses)</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Flat misses Fines */}
                    <div className="bg-slate-950/40 border border-slate-900/80 rounded-xl p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-[#00FF95] mb-3 font-bold">Flat Penalty Fees (Per missed day)</p>
                      <div className="space-y-2">
                        {punishmentOutcome.flatRates?.map((item: any) => (
                          <div key={item.userId} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-900 last:border-0">
                            <span className="text-slate-300 font-medium">{item.name}</span>
                            <span className="font-mono text-slate-200">{item.formattedFee} owed ({item.missed} misses)</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Geared Drills */}
                    <div className="bg-slate-950/40 border border-slate-900/80 rounded-xl p-4">
                      <p className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-3 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" /> AI Squad Penance Ritual Card
                      </p>
                      <div className="space-y-2.5">
                        {punishmentOutcome.workoutGearedExercises?.map((drill: string, idx: number) => (
                          <div key={idx} className="text-xs leading-relaxed text-slate-300 p-2 bg-slate-900/50 rounded border border-slate-800/80">
                            {drill}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 font-mono text-xs">
                    Could not load penalty outcomes context. Click recalculate.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <WorkoutHistory
              history={historyList}
              users={membersMap}
              currentUser={userProfile}
            />
          )}

          {activeTab === "reminders" && partyDoc && (
            <ReminderScheduler
              reminderSettings={partyDoc.reminderSettings}
              users={membersMap}
              currentUser={userProfile}
              onUpdateSettings={handleUpdateReminderSettings}
            />
          )}

        </div>
      </main>

      {/* Pop-up dynamic mobile lockscreen simulator modal */}
      <AnimatePresence>
        {popupNotification && popupNotification.visible && (
          <div className="fixed top-6 right-6 z-50 max-w-sm w-full bg-[#181a1f] border-2 border-emerald-500/20 rounded-2xl shadow-2xl overflow-hidden p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-500/20 text-[#00FF95] rounded-xl shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-display font-medium text-xs text-white uppercase font-bold tracking-wider">
                    {popupNotification.title}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 font-bold">Now</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{popupNotification.message}</p>
              </div>
              <button
                onClick={() => setPopupNotification(null)}
                className="text-slate-500 hover:text-white transition text-xs font-mono font-bold self-start cursor-pointer"
              >
                ✕
              </button>
            </div>
            {/* Ambient progress indicator bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#00FF95]/30 animate-pulse" />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
