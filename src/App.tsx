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
  LockKeyhole,
  Camera,
  Image,
  Upload
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
  writeBatch,
  deleteDoc
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
  const [customAvatarBase64, setCustomAvatarBase64] = useState<string>("");
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string>("");
  const [avatarSelectionMode, setAvatarSelectionMode] = useState<"premade" | "upload" | "url">("premade");

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
  const [activeTab, setActiveTab] = useState<"dashboard" | "party" | "social" | "punishments" | "history" | "reminders" | "admin">("dashboard");
  const [errorMess, setErrorMess] = useState<string>("");

  // Admin access state variables
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [adminCodeInput, setAdminCodeInput] = useState<string>("");
  const [adminUnlockError, setAdminUnlockError] = useState<string>("");
  const [newAdminCodeToAdd, setNewAdminCodeToAdd] = useState<string>("");
  const [additionalAdminCodes, setAdditionalAdminCodes] = useState<string[]>([]);

  // AI workout generation form settings
  const [daysCount, setDaysCount] = useState<number>(3);
  const [workoutStyle, setWorkoutStyle] = useState<string>("calisthenics");
  const [fitnessGoals, setFitnessGoals] = useState<string>("overhead stability & handstand skills");
  const [limitationsText, setLimitationsText] = useState<string>("parallettes and floor space only, no heavy squat rack");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);

  // Profile editing inputs
  const [editNameProfile, setEditNameProfile] = useState<string>("");
  const [editAvatarIndex, setEditAvatarIndex] = useState<number>(0);
  const [editCustomAvatarBase64, setEditCustomAvatarBase64] = useState<string>("");
  const [editCustomAvatarUrl, setEditCustomAvatarUrl] = useState<string>("");
  const [editAvatarMode, setEditAvatarMode] = useState<"premade" | "upload" | "url">("premade");
  const [editProfileTarget, setEditProfileTarget] = useState<number>(3);
  const [editProfileSaving, setEditProfileSaving] = useState<boolean>(false);

  // Sync profile edits with session profile state
  useEffect(() => {
    if (userProfile) {
      setEditNameProfile(userProfile.name || "");
      setEditProfileTarget(userProfile.weeklyTarget || 3);
      const matchedIdx = AVATARS.findIndex(av => av.url === userProfile.avatar);
      if (matchedIdx !== -1) {
        setEditAvatarIndex(matchedIdx);
        setEditAvatarMode("premade");
      } else if (userProfile.avatar && userProfile.avatar.startsWith("data:image")) {
        setEditCustomAvatarBase64(userProfile.avatar);
        setEditAvatarMode("upload");
      } else if (userProfile.avatar) {
        setEditCustomAvatarUrl(userProfile.avatar);
        setEditAvatarMode("url");
      }
    }
  }, [userProfile, activeTab]);

  // Dynamic dynamic penalty splits outcomes
  const [punishmentOutcome, setPunishmentOutcome] = useState<any>(null);
  const [isCalcingPenalty, setIsCalcingPenalty] = useState<boolean>(false);
  const [isSandboxOpen, setIsSandboxOpen] = useState<boolean>(false);

  // Custom reminder template simulation notification
  const [popupNotification, setPopupNotification] = useState<{ title: string; message: string; visible: boolean } | null>(null);

  // Listen to additional admin codes
  useEffect(() => {
    if (!firebaseUser) {
      setAdditionalAdminCodes([]);
      return;
    }
    const unsubscribeCodes = onSnapshot(collection(db, "admin_codes"), (snap) => {
      const codes: string[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data && data.code) {
          codes.push(data.code.toUpperCase());
        }
      });
      setAdditionalAdminCodes(codes);
    }, (err) => console.error("Admin codes subscription failed: ", err));

    return () => unsubscribeCodes();
  }, [firebaseUser]);

  // Admin Registered Users State
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<User[]>([]);
  const [allPartiesList, setAllPartiesList] = useState<any[]>([]);

  useEffect(() => {
    if (!firebaseUser || activeTab !== "admin") return;
    
    const unsubscribeAllUsers = onSnapshot(collection(db, "users"), (snap) => {
      const list: User[] = [];
      snap.forEach((d) => {
        list.push(d.data() as User);
      });
      setAllRegisteredUsers(list);
    }, (err) => {
      console.error("All users subscription failed: ", err);
    });

    const unsubscribeAllParties = onSnapshot(collection(db, "parties"), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      setAllPartiesList(list);
    }, (err) => {
      console.error("All parties subscription failed: ", err);
    });

    return () => {
      unsubscribeAllUsers();
      unsubscribeAllParties();
    };
  }, [firebaseUser, activeTab]);

  // 1. Listen for standard Authentication states on mount
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (user) {
        // Real-time listener on their profile
        const profileRef = doc(db, "users", user.uid);
        unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as User);
          } else {
            setUserProfile(null); // Triggers Profile Onboarding flow
          }
          setAuthLoading(false);
        }, (err) => {
          console.error("User profile subscription error:", err);
          setAuthLoading(false);
        });
      } else {
        setUserProfile(null);
        setAuthLoading(false);
      }
    });
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1500000) {
      alert("Please upload an image smaller than 1.5MB to save profile storage.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setCustomAvatarBase64(reader.result);
        setEditCustomAvatarBase64(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Custom onboarding first profile configurations logger
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim() || !firebaseUser) return;
    setProfileSaving(true);
    try {
      const uId = firebaseUser.uid;
      
      let avatarUrl = AVATARS[setupAvatarIndex]?.url;
      if (avatarSelectionMode === "upload" && customAvatarBase64) {
        avatarUrl = customAvatarBase64;
      } else if (avatarSelectionMode === "url" && customAvatarUrl.trim()) {
        avatarUrl = customAvatarUrl.trim();
      }

      const profilePayload: User = {
        id: uId,
        name: setupName,
        email: firebaseUser.email || "",
        avatar: avatarUrl || AVATARS[0].url,
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

  // Save modifications to the current user profile (nickname, picture, target)
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNameProfile.trim() || !userProfile || !firebaseUser) return;
    setEditProfileSaving(true);
    try {
      let finalAvatar = AVATARS[editAvatarIndex]?.url;
      if (editAvatarMode === "upload" && editCustomAvatarBase64) {
        finalAvatar = editCustomAvatarBase64;
      } else if (editAvatarMode === "url" && editCustomAvatarUrl.trim()) {
        finalAvatar = editCustomAvatarUrl.trim();
      }

      await updateDoc(doc(db, "users", firebaseUser.uid), {
        name: editNameProfile.trim(),
        avatar: finalAvatar || AVATARS[0].url,
        weeklyTarget: editProfileTarget
      });

      alert("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert("Failed to update profile: " + err.message);
    } finally {
      setEditProfileSaving(false);
    }
  };

  // Permanently disassemble a workout squad and reset members back to activation screen
  const handleDeleteParty = async (partyId: string, partyName: string) => {
    if (!window.confirm(`⚠️ Are you sure you want to PERMANENTLY DELETE the workout squad "${partyName}"? \n\nThis will instantly dissolve the squad, remove all members, and obliterate its training plans and history logs.`)) return;
    
    try {
      // 1. Disconnect all users currently registered inside this party
      const squadMembers = allRegisteredUsers.filter(u => u.currentPartyId === partyId);
      for (const m of squadMembers) {
        await updateDoc(doc(db, "users", m.id), {
          currentPartyId: ""
        });
      }

      // 2. Delete the main party doc
      await deleteDoc(doc(db, "parties", partyId));

      alert(`Squad "${partyName}" has been successfully deleted.`);
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete squad: " + err.message);
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
              <label className="block text-xs font-mono uppercase text-slate-400 mb-2">Configure Trainee Profile Picture</label>
              
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-3">
                <button
                  type="button"
                  onClick={() => setAvatarSelectionMode("premade")}
                  className={`py-1.5 text-[10.5px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                    avatarSelectionMode === "premade"
                      ? "bg-slate-800 text-[#00FF95]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Premade
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarSelectionMode("upload")}
                  className={`py-1.5 text-[10.5px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                    avatarSelectionMode === "upload"
                      ? "bg-slate-800 text-[#00FF95]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarSelectionMode("url")}
                  className={`py-1.5 text-[10.5px] font-mono font-bold rounded-lg transition-all cursor-pointer ${
                    avatarSelectionMode === "url"
                      ? "bg-slate-800 text-[#00FF95]"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Image URL
                </button>
              </div>

              {avatarSelectionMode === "premade" && (
                <div className="grid grid-cols-4 gap-2">
                  {AVATARS.map((av, idx) => {
                    const isSelected = setupAvatarIndex === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSetupAvatarIndex(idx)}
                        className={`relative p-1 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? "border-[#00FF95] bg-[#00ff950a] scale-105" : "border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                        }`}
                      >
                        <img src={av.url} alt={av.name} className="w-full h-12 rounded-lg object-cover" />
                        {isSelected && <div className="absolute top-0 right-0 -m-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#111215] text-[7px] text-black font-extrabold">✓</div>}
                      </button>
                    );
                  })}
                </div>
              )}

              {avatarSelectionMode === "upload" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <div className="w-14 h-14 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center text-slate-500">
                      {customAvatarBase64 ? (
                        <img src={customAvatarBase64} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-mono text-slate-400 uppercase font-bold">Upload Custom Avatar</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="onboarding-avatar-file-input"
                      />
                      <label
                        htmlFor="onboarding-avatar-file-input"
                        className="inline-flex mt-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-mono font-semibold text-white rounded-lg border border-slate-800 transition cursor-pointer"
                      >
                        <Upload className="w-3 h-3 mr-1.5 self-center" /> Choose Image File
                      </label>
                    </div>
                  </div>
                  {customAvatarBase64 && (
                    <p className="text-[9.5px] font-mono text-emerald-400">✓ Personalized file processed successfully!</p>
                  )}
                </div>
              )}

              {avatarSelectionMode === "url" && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={customAvatarUrl}
                      onChange={(e) => setCustomAvatarUrl(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    {customAvatarUrl && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-800 bg-slate-950">
                        <img src={customAvatarUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as any).src = AVATARS[0].url; }} />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block">Provide any direct web address starting with http/https.</span>
                </div>
              )}
              
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

            <button
              id="nav-btn-profile"
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left cursor-pointer ${
                activeTab === "profile"
                  ? "bg-[#00ff951a] text-[#00FF95] font-extrabold border-l-4 border-[#00FF95]"
                  : "text-[#888888] hover:text-[#00FF95] hover:bg-[#ffffff05]"
              }`}
            >
              <UserIcon className="w-4.5 h-4.5" />
              <span>My Profile Settings</span>
            </button>

            <button
              id="nav-btn-admin"
              onClick={() => setActiveTab("admin")}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all text-left cursor-pointer ${
                activeTab === "admin"
                  ? "bg-[#ff44441a] text-rose-400 font-extrabold border-l-4 border-rose-500"
                  : "text-[#888888] hover:text-rose-400 hover:bg-[#ff444405]"
              }`}
            >
              <LockKeyhole className="w-4.5 h-4.5" />
              <span>Secure Admin</span>
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
        <button onClick={() => setActiveTab("profile")} className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "profile" ? "text-[#00FF95]" : "text-slate-500"}`}>
          <UserIcon className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-mono">Profile</span>
        </button>
        <button onClick={() => setActiveTab("admin")} className={`flex flex-col items-center justify-center p-1 cursor-pointer ${activeTab === "admin" ? "text-rose-400" : "text-slate-500"}`}>
          <LockKeyhole className="w-5 h-5" />
          <span className="text-[9px] mt-0.5 font-mono">Admin</span>
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

          {activeTab === "profile" && userProfile && (
            <div id="profile-settings-panel" className="max-w-2xl mx-auto space-y-6">
              <div className="bg-gradient-to-r from-emerald-950/20 to-slate-900/40 border border-emerald-500/20 p-6 rounded-2xl flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-[#00FF95]/20">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-display font-extrabold text-white uppercase tracking-tight">
                    Trainee Profile Customisation
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Manage your tactical training callsign, aesthetic display avatar, and weekly workout goals.
                  </p>
                </div>
              </div>

              <div className="bg-[#090b0e]/60 border border-slate-900/80 rounded-2xl p-6 sm:p-8">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {/* Current profile status glance */}
                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-900 flex items-center gap-4">
                    <img 
                      src={
                        editAvatarMode === "premade" 
                          ? AVATARS[editAvatarIndex]?.url 
                          : editAvatarMode === "upload" 
                          ? editCustomAvatarBase64 || userProfile.avatar 
                          : editCustomAvatarUrl || userProfile.avatar
                      } 
                      alt="Current preview" 
                      className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                      onError={(e) => { (e.target as any).src = AVATARS[0].url; }}
                    />
                    <div>
                      <h4 className="text-xs font-mono uppercase text-slate-500">Active Identity Preview</h4>
                      <p className="text-sm font-bold text-white mt-0.5">{editNameProfile || userProfile.name}</p>
                      <div className="flex items-center gap-2 mt-1 shrink-0 font-mono text-[9px] text-slate-400">
                        <span className="bg-[#00ff951a] text-[#00FF95] px-2 py-0.5 rounded border border-[#00FF95]/20">🔥 {userProfile.streak}w streak</span>
                        <span className="bg-slate-900 text-slate-300 px-2 py-0.5 rounded border border-slate-800">🎯 {editProfileTarget} workouts target</span>
                      </div>
                    </div>
                  </div>

                  {/* Nickname */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold block mb-1">Trainee Callsign (Nickname)</label>
                    <input
                      type="text"
                      required
                      value={editNameProfile}
                      onChange={(e) => setEditNameProfile(e.target.value)}
                      placeholder="e.g. SQUAD_COMMANDER_01"
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 outline-none transition"
                    />
                  </div>

                  {/* Picture Modes Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold block">Aesthetic Visual Avatar</label>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setEditAvatarMode("premade")}
                        className={`py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                          editAvatarMode === "premade"
                            ? "bg-slate-800 text-[#00FF95]"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Premade
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditAvatarMode("upload")}
                        className={`py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                          editAvatarMode === "upload"
                            ? "bg-slate-800 text-[#00FF95]"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditAvatarMode("url")}
                        className={`py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                          editAvatarMode === "url"
                            ? "bg-slate-800 text-[#00FF95]"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Image URL
                      </button>
                    </div>

                    {/* Premade option content */}
                    {editAvatarMode === "premade" && (
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {AVATARS.map((av, idx) => {
                          const isSelected = editAvatarIndex === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setEditAvatarIndex(idx)}
                              className={`relative p-1 rounded-xl border transition-all cursor-pointer ${
                                isSelected ? "border-[#00FF95] bg-[#00ff950a] scale-105" : "border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                              }`}
                            >
                              <img src={av.url} alt={av.name} className="w-full h-12 rounded-lg object-cover" />
                              {isSelected && <div className="absolute top-0 right-0 -m-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#111215] text-[7px] text-black font-extrabold">✓</div>}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Upload File option content */}
                    {editAvatarMode === "upload" && (
                      <div className="space-y-3 pt-1">
                        <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="w-14 h-14 bg-slate-900 rounded-xl overflow-hidden shrink-0 border border-slate-800 flex items-center justify-center text-slate-500">
                            {editCustomAvatarBase64 ? (
                              <img src={editCustomAvatarBase64} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-6 h-6" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-mono text-slate-400 uppercase font-bold">Pick local photograph</p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="hidden"
                              id="edit-profile-avatar-file-input"
                            />
                            <label
                              htmlFor="edit-profile-avatar-file-input"
                              className="inline-flex mt-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-xs font-mono font-semibold text-white rounded-lg border border-slate-800 transition cursor-pointer"
                            >
                              <Upload className="w-3 h-3 mr-1.5 self-center" /> Choose Image File
                            </label>
                          </div>
                        </div>
                        {editCustomAvatarBase64 && (
                          <p className="text-[9.5px] font-mono text-emerald-400">✓ Personalized file processed successfully!</p>
                        )}
                      </div>
                    )}

                    {/* Web Image URL option content */}
                    {editAvatarMode === "url" && (
                      <div className="space-y-2 pt-1">
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="https://images.unsplash.com/photo-..."
                            value={editCustomAvatarUrl}
                            onChange={(e) => setEditCustomAvatarUrl(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-3 py-2 text-xs text-white outline-none"
                          />
                        </div>
                        <span className="text-[10px] text-[#888888] block">Provide any direct link starting with http/https.</span>
                      </div>
                    )}
                  </div>

                  {/* Weekly goal target days */}
                  <div className="space-y-1 text-left">
                    <label className="text-xs font-mono text-slate-400 uppercase tracking-widest font-bold block mb-1">Weekly Target Workout Days</label>
                    <select
                      value={editProfileTarget}
                      onChange={(e) => setEditProfileTarget(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#00FF95] rounded-xl px-4 py-3 text-white text-sm outline-none font-mono"
                    >
                      <option value={3}>3 Days/Week (Maintain Strength)</option>
                      <option value={4}>4 Days/Week (Active Growth)</option>
                      <option value={5}>5 Days/Week (High Performance Warrior)</option>
                    </select>
                  </div>

                  {/* Submission action */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={editProfileSaving}
                      className="w-full bg-[#00FF95] hover:bg-[#00e083] disabled:opacity-50 text-slate-950 font-black tracking-wider text-xs uppercase py-3.5 rounded-xl transition shadow-lg shadow-[#00FF95]/10 cursor-pointer text-center font-bold"
                    >
                      {editProfileSaving ? "Saving Identity Configs..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === "admin" && (
            <div id="admin-panel" className="space-y-6">
              {!isAdminUnlocked ? (
                /* Admin Unlock Locked Screen */
                <div className="max-w-md mx-auto bg-[#0a0f1d]/80 border-2 border-[#ff44442a] rounded-3xl p-8 shadow-2xl text-center space-y-6">
                  <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/20">
                    <LockKeyhole className="w-8 h-8 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-extrabold text-white uppercase tracking-tight">Security Credentials Required</h2>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      This panel contains powerful system administration utilities. Please enter your secure squad master code or secondary moderator code below.
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formatted = adminCodeInput.trim().toUpperCase();
                      if (formatted === "SQUAD_LEADER_A" || additionalAdminCodes.includes(formatted)) {
                        setIsAdminUnlocked(true);
                        setAdminUnlockError("");
                      } else {
                        setAdminUnlockError("Access Denied: Invalid Security Code.");
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-1 text-left">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Admin Code</label>
                      <input
                        type="password"
                        placeholder="••••••••••••••"
                        value={adminCodeInput}
                        onChange={(e) => setAdminCodeInput(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-rose-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-700 outline-none transition"
                      />
                    </div>

                    {adminUnlockError && (
                      <p className="text-xs text-rose-400 font-mono flex items-center justify-center gap-1.5 p-2 bg-rose-500/10 rounded-lg border border-rose-500/20 animate-bounce">
                        <AlertCircle className="w-4 h-4" /> {adminUnlockError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full bg-rose-500 hover:bg-rose-400 text-slate-950 font-black tracking-wider text-xs uppercase py-3 rounded-xl transition shadow-lg shadow-rose-500/10 cursor-pointer"
                    >
                      Authenticate Access Key
                    </button>
                  </form>
                </div>
              ) : (
                /* Admin Active Screen */
                <div className="space-y-6">
                  {/* secure header banner */}
                  <div className="bg-gradient-to-r from-rose-950/20 to-slate-900/40 border border-rose-500/20 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
                        <LockKeyhole className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-base font-display font-extrabold text-white uppercase tracking-tight flex items-center gap-2">
                          ADMINISTRATIVE CONTROL CENTER <span className="bg-rose-500/25 text-rose-300 text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-rose-500/30">UNLOCKED</span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          You are currently logged into the high-privilege console. Deleting trainees takes real-time database effect.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsAdminUnlocked(false);
                        setAdminCodeInput("");
                      }}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 hover:text-rose-300 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Lock Console
                    </button>
                  </div>

                  {/* admin cards layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* User Deletion Board */}
                    <div className="lg:col-span-2 bg-[#090b0e]/60 border border-slate-900/80 rounded-2xl p-6 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
                        <div>
                          <h3 className="text-sm font-extrabold text-white uppercase font-display">Trainees and Squad Members Directory</h3>
                          <p className="text-xs text-slate-500 mt-0.5 font-mono">Total Registered Users: {allRegisteredUsers.length}</p>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {allRegisteredUsers.length === 0 ? (
                          <div className="text-center py-12 text-slate-500 font-mono text-xs">
                            No registered software trainees matching in Firestore collection.
                          </div>
                        ) : (
                          allRegisteredUsers.map((user) => {
                            const isCurrentUser = user.id === firebaseUser?.uid;
                            return (
                              <div
                                key={user.id}
                                className="bg-slate-900/20 hover:bg-slate-900/60 border border-slate-800/60 hover:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <img
                                    src={user.avatar}
                                    alt={user.name}
                                    referrerPolicy="no-referrer"
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-800 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                                      {isCurrentUser && (
                                        <span className="bg-emerald-500/20 text-emerald-300 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold shrink-0">
                                          You
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10.5px] text-slate-400 truncate font-mono mt-0.5">{user.email}</p>
                                    <div className="flex items-center gap-3 mt-1.5 font-mono text-[9px] text-slate-500">
                                      <span>🔥 Streak: <strong className="text-[#00FF95]/95">{user.streak}w</strong></span>
                                      <span>🎯 Target: <strong className="text-slate-300">{user.weeklyTarget}w/wk</strong></span>
                                      <span>📈 Completion: <strong className="text-sky-400">{user.completionRate}%</strong></span>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  onClick={async () => {
                                    if (!window.confirm(`⚠️ Are you sure you want to PERMANENTLY DELETE user "${user.name}" (${user.email}) from Firestore database? \n\nThis will also expel them from current squads and wipe their history.`)) return;
                                    try {
                                      await deleteDoc(doc(db, "users", user.id));
                                      if (partyDoc) {
                                        await deleteDoc(doc(db, "parties", partyDoc.id, "members", user.id));
                                      }
                                      if (isCurrentUser) {
                                        await signOut(auth);
                                      } else {
                                        alert("Trainee successfully purged.");
                                      }
                                    } catch (err: any) {
                                      console.error(err);
                                      alert("Could not complete purge operation: " + err.message);
                                    }
                                  }}
                                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 rounded-xl text-[10.5px] font-mono font-bold border border-rose-500/20 hover:border-transparent transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Purge Account
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Admin Codes config */}
                    <div className="bg-[#090b0e]/60 border border-slate-900/80 rounded-2xl p-6 space-y-6">
                      <div className="space-y-1">
                        <h3 className="text-sm font-extrabold text-white uppercase font-display">Manage Security Keys</h3>
                        <p className="text-xs text-slate-500 font-mono">Create and delete additional administrative access tokens.</p>
                      </div>

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!newAdminCodeToAdd.trim()) return;
                          const formatted = newAdminCodeToAdd.trim().toUpperCase();
                          try {
                            await setDoc(doc(db, "admin_codes", formatted), {
                              code: formatted,
                              addedAt: new Date().toISOString()
                            });
                            setNewAdminCodeToAdd("");
                            alert(`Admin access key '${formatted}' registered successfully!`);
                          } catch (err: any) {
                            console.error(err);
                            alert("Failed to register code: " + err.message);
                          }
                        }}
                        className="space-y-3"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">New Security Code</label>
                          <input
                            type="text"
                            placeholder="e.g. SQUAD_MOD_2026"
                            value={newAdminCodeToAdd}
                            onChange={(e) => setNewAdminCodeToAdd(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-xl px-3 py-2.5 text-xs text-white uppercase tracking-wider outline-none transition"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-[#00FF95] hover:bg-[#00e083] text-slate-950 font-bold text-xs uppercase py-2.5 rounded-xl transition cursor-pointer font-black tracking-wider"
                        >
                          Register Security Key
                        </button>
                      </form>

                      {/* list of keys */}
                      <div className="space-y-3 pt-2">
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Authorized Keys</p>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {/* Default master */}
                          <div className="bg-[#0f172a] border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs">
                            <span className="font-mono text-amber-400 font-bold">•••••••• (Master Key)</span>
                            <span className="text-[9px] font-mono uppercase bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/20">System Master</span>
                          </div>

                          {additionalAdminCodes.map((code) => (
                            <div key={code} className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs transition">
                              <span className="font-mono text-rose-300 font-bold">{code}</span>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm(`Are you sure you want to revoke admin key '${code}'?`)) return;
                                  try {
                                    await deleteDoc(doc(db, "admin_codes", code));
                                  } catch (err: any) {
                                    console.error(err);
                                    alert("Could not revoke code: " + err.message);
                                  }
                                }}
                                className="p-1 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-mono font-bold border border-rose-500/20 transition cursor-pointer"
                              >
                                Revoke
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Squad Party & Activity Management Board */}
                  <div className="bg-[#090b0e]/60 border border-slate-900/80 rounded-2xl p-6 space-y-6">
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase font-display flex items-center gap-2">
                        <Users className="text-rose-400 w-4 h-4" /> Active Squad Parties Directory ({allPartiesList.length})
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        Monitor active routines, view participating trainees, watch activity levels, or delete groups.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {allPartiesList.length === 0 ? (
                        <div className="col-span-2 text-center py-12 text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                          No active fitness workout parties matching in database.
                        </div>
                      ) : (
                        allPartiesList.map((party) => {
                          const partyMembers = allRegisteredUsers.filter(u => u.currentPartyId === party.id);
                          
                          return (
                            <div 
                              key={party.id}
                              className="bg-slate-900/30 hover:bg-slate-900/70 border border-slate-800/80 hover:border-slate-800 p-4 rounded-xl space-y-4 transition flex flex-col justify-between"
                            >
                              <div className="space-y-3 font-sans text-left">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-bold text-white text-sm">{party.name || "Unnamed Party"}</h4>
                                    <span className="font-mono text-[9px] text-slate-500 tracking-wider">CODE: <strong className="text-[#00FF95] uppercase">{party.code}</strong></span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteParty(party.id, party.name || "Unnamed")}
                                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 rounded-lg text-xs font-mono font-bold border border-rose-500/20 hover:border-transparent transition flex items-center gap-1 cursor-pointer"
                                    title="Disband workout party"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Disband
                                  </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 font-mono">
                                  <div>
                                    <span className="text-slate-500 block">Weekly Routine:</span>
                                    <span className="text-slate-300 font-bold">{party.activePlan ? `${party.activePlan.length} days` : "No active plan"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500 block">Slack Fine:</span>
                                    <span className="text-amber-400 font-bold">
                                      {party.punishmentConfig?.penaltyType === "split" 
                                        ? `$${party.punishmentConfig?.splitAmount || 0} Split` 
                                        : `$${party.punishmentConfig?.flatAmount || 0} Solo`
                                      }
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Trainees ({partyMembers.length}) & Progress:</span>
                                  {partyMembers.length === 0 ? (
                                    <p className="text-[10.5px] text-slate-600 font-mono italic">No trainees active inside this party.</p>
                                  ) : (
                                    <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                                      {partyMembers.map(m => (
                                        <div key={m.id} className="flex items-center justify-between text-xs bg-slate-950/20 p-1.5 rounded border border-slate-900/60 font-mono">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <img src={m.avatar} alt={m.name} className="w-4 h-4 rounded-full object-cover border border-slate-800 shrink-0" />
                                            <span className="text-slate-300 font-bold truncate">{m.name}</span>
                                          </div>
                                          <div className="text-[9.5px] text-slate-400 font-mono shrink-0 flex items-center gap-1.5">
                                            <span className="text-indigo-400">🔥{m.streak}w</span>
                                            <span className="text-emerald-400">💪{m.workoutsCompleted} done</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="text-[9.5px] font-mono text-slate-500 border-t border-slate-900 pt-2.5 flex items-center justify-between">
                                <span>Ref: {party.id.substring(0, 8)}...</span>
                                <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-900 text-[8.5px] text-slate-400">Activity Level: Active</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
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
