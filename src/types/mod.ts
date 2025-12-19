/**
 * Devex type definitions
 * All data schemas for the experiment tracking system
 *
 * Date handling: All datetime fields use Date objects at runtime.
 * Serialization to/from JSON (ISO strings) happens in the storage layer.
 */

// =============================================================================
// Global Config
// =============================================================================

export interface GlobalConfig {
  version: number;
  activeExperiment: string | null;
  dataDir: string;

  defaults: {
    blockDuration: number; // days, default: 14
    checkinFrequency: number; // per day, default: 3
    checkinPrompts: boolean; // show reminders, default: true
  };

  repositories: string[]; // paths to repos for git metrics

  git: {
    autoCommit: boolean; // default: true
    commitOnBlockEnd: boolean;
    commitOnDailyLog: boolean;
    commitOnWeeklyReflection: boolean;
  };

  github?: {
    token?: string; // Personal Access Token for GitHub API
  };
}

// =============================================================================
// Experiment
// =============================================================================

export interface Condition {
  description: string;
  allowed?: string[];
  forbidden?: string[];
  notes?: string;
}

export interface PromptDefinition {
  id: string;
  question: string;
  type: "rating" | "boolean" | "text" | "choice" | "number";
  options?: string[]; // for choice type
  min?: number; // for rating/number
  max?: number;
  required: boolean;
  default?: unknown;
}

export interface Experiment {
  version: number;
  name: string;
  description?: string;
  createdAt: Date;
  template?: string; // template used to create

  hypotheses: string[];

  conditions: Record<string, Condition>;

  // Custom questions (if not using defaults)
  prompts?: {
    checkin?: PromptDefinition[];
    daily?: PromptDefinition[];
    weekly?: PromptDefinition[];
  };
}

// =============================================================================
// Block
// =============================================================================

export interface BlockSummary {
  description: string;
  surprises: string;
  confirmedExpectations: string;
  completedAt: Date;
}

export interface Block {
  id: string; // e.g., "no-ai-1"
  condition: string;
  tags: string[];

  startDate: Date;
  endDate?: Date; // undefined if block is active
  expectedDuration: number; // days

  summary?: BlockSummary;

  metrics?: GitMetrics; // cached when block ends
}

// =============================================================================
// Checkin
// =============================================================================

export interface Checkin {
  id: string; // uuid
  timestamp: Date;
  block: string;
  dayInBlock: number;

  // Core fields (always present)
  prompted: boolean; // was this from a prompt or manual?
  promptedAt?: Date; // when prompt was shown

  // Default fields (can be extended by experiment)
  energy?: number; // 1-5
  focus?: number; // 1-5
  stuck?: boolean;
  stuckMinutes?: number;
  oneWord?: string;

  // Extension fields from custom prompts
  custom?: Record<string, unknown>;
}

// Checkins stored as array per day
export interface DailyCheckins {
  date: string; // YYYY-MM-DD (date string, not datetime)
  checkins: Checkin[];
}

// =============================================================================
// Daily Log
// =============================================================================

export interface DailyLog {
  date: string; // YYYY-MM-DD (date string, not datetime)
  block: string;
  completedAt: Date;

  // Default fields
  shipped?: string;
  struggled?: string;

  ratings?: {
    confidence?: number;
    understanding?: number;
    fulfillment?: number;
    enjoyment?: number;
    cognitiveLoad?: number;
  };

  taskTypes?: TaskType[];
  notes?: string;

  // Extension fields
  custom?: Record<string, unknown>;
}

// =============================================================================
// Weekly Reflection
// =============================================================================

export interface WeeklyReflection {
  week: string; // YYYY-Www (ISO week string)
  block: string;
  completedAt: Date;

  // Default fields
  shipped?: string;
  patterns?: string;
  frustrations?: string;
  delights?: string;
  codebaseFeel?: string;
  lookingForward?: string;
  wouldChange?: string;

  ratings?: {
    productivity?: number;
    quality?: number;
    fulfillment?: number;
    mentalClarity?: number;
  };

  // Extension fields
  custom?: Record<string, unknown>;
}

// =============================================================================
// Git Metrics
// =============================================================================

export interface RepoMetrics {
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  testFilesChanged: number;
  docFilesChanged: number;
  avgCommitsPerDay: number;
  firstCommitTimes: Date[]; // for procrastination analysis
}

export interface GitMetrics {
  block: string;
  computedAt: Date;

  dateRange: {
    start: Date;
    end: Date;
  };

  repositories: Record<string, RepoMetrics>;

  totals: RepoMetrics;
}

// =============================================================================
// Analysis Stats
// =============================================================================

export interface CheckinStats {
  count: number;
  promptedCount: number;
  avgEnergy: number | null;
  avgFocus: number | null;
  stuckPercent: number;
  avgStuckMinutes: number | null;
  topWords: Array<{ word: string; count: number }>;
}

export interface DailyStats {
  count: number;
  avgRatings: {
    confidence: number | null;
    understanding: number | null;
    fulfillment: number | null;
    enjoyment: number | null;
    cognitiveLoad: number | null;
  };
  taskTypeDistribution: {
    routine: number;
    integrative: number;
    creative: number;
  };
}

export interface BlockReport {
  block: Block;
  gitMetrics: GitMetrics | null;
  checkinStats: CheckinStats;
  dailyStats: DailyStats;
}

// =============================================================================
// Templates
// =============================================================================

export interface ExperimentTemplate {
  name: string;
  description: string;
  hypotheses: string[];
  conditions: Record<string, Condition>;
  prompts?: {
    checkin?: PromptDefinition[];
    daily?: PromptDefinition[];
    weekly?: PromptDefinition[];
  };
}

// =============================================================================
// Utility Types
// =============================================================================

export type TaskType = "routine" | "integrative" | "creative";

export interface ParsedArgs {
  _: (string | number)[];
  [key: string]: unknown;
}

export type CommandHandler = (args: ParsedArgs) => Promise<void>;

// Schema versions for future migration
export const SCHEMA_VERSIONS = {
  config: 1,
  experiment: 1,
  block: 1,
  checkin: 1,
  dailyLog: 1,
  weeklyReflection: 1,
} as const;
