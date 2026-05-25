export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  streak: number;
  completionRate: number; // percentage
  workoutsCompleted: number;
  workoutsMissed: number;
  weeklyTarget: number; // e.g., 3 workouts/week
  isSlacking: boolean;
}

export interface DayWorkout {
  dayName: string;
  focus: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  rest: string;
  completedBy: { [userId: string]: boolean };
}

export interface PunishmentConfig {
  model: 'workout-geared' | 'flat-rate' | 'scaled-percentage';
  flatRateAmount: number; // e.g., $10 or $5
  weeklyPayloadPool: string; // e.g., "300 burpees total", "$50 pizza fund"
  customPrompt?: string;
}

export interface ActiveNudge {
  id: string;
  fromUser: string;
  toUser: string;
  message: string;
  channel: 'push' | 'chat';
  timestamp: string;
}

export interface HistoryEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  workoutTitle: string;
  workoutType: string;
  completedAt: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
  }[];
}

export interface ReminderSettings {
  morningEnabled: boolean;
  morningTime: string;
  midDayEnabled: boolean;
  midDayTime: string;
  nightEnabled: boolean;
  nightTime: string;
  customMessageTemplate?: string;
}

export interface PartyState {
  id: string;
  name: string;
  users: { [id: string]: User };
  activePlan: DayWorkout[];
  punishmentConfig: PunishmentConfig;
  nudges: ActiveNudge[];
  history: HistoryEntry[];
  reminderSettings: ReminderSettings;
}
