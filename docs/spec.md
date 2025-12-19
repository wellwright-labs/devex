# Devex — Specification
---

## Overview

A command-line tool for developers to run structured self-experiments on their workflow, productivity, and experience. Users define hypotheses, work in time-boxed blocks under different conditions, and collect both subjective (checkins, reflections) and objective (git metrics) data to evaluate their hypotheses.

While `devex` ships with a default "AI-assisted coding" experiment template, it's designed to support any workflow experiment: editor changes, work schedule variations, music/environment, methodology shifts, etc.

---

## Core Concepts

### Experiment

A structured investigation with:
- **Hypotheses**: What you're trying to learn (e.g., "I ship more code with AI assistance")
- **Conditions**: The different states you'll work under (e.g., "no-ai", "full-ai")
- **Blocks**: Time periods spent in each condition
- **Measurements**: What you're tracking (checkins, daily logs, git metrics)

An experiment can be ongoing/indefinite or have a target end date.

### Block

A time-bounded period (default: 2 weeks) where you work under a specific condition. Blocks have:
- A **condition** (from experiment's defined conditions)
- **Tags** for categorization
- Start/end dates
- Associated checkins, logs, and metrics

### Condition

A defined working state with:
- Name (e.g., "no-ai", "standing-desk", "pomodoro")
- Description
- Rules (what's allowed/forbidden, or just descriptive notes)

### Checkin

A micro-measurement taken periodically during work. Quick (30 seconds), structured prompts capturing current state. Frequency is configurable.

### Daily Log

End-of-day reflection capturing what shipped, struggles, and subjective ratings.

### Weekly Reflection

Longer-form reflection at week's end for pattern recognition and deeper analysis.

### Dev Log

Append-only stream of timestamped freeform observations. No structure required.

### Metrics

Objective measurements. Currently supports git-based metrics (commits, lines changed, etc.) from configured repositories.

---

## Data Storage

All data lives in `~/.config/devex/` by default (or `~/devex/` on systems without XDG).

```
~/.config/devex/
├── config.json              # Global configuration
├── experiments/
│   └── ai-coding/           # One directory per experiment
│       ├── experiment.json  # Experiment definition
│       ├── blocks/
│       │   ├── no-ai-1.json
│       │   └── full-ai-1.json
│       ├── checkins/
│       │   └── 2025-01-15.json
│       ├── daily/
│       │   └── 2025-01-15.json
│       ├── weekly/
│       │   └── 2025-W03.json
│       ├── devlog.md
│       ├── violations.json
│       └── metrics/
│           └── no-ai-1.json
└── templates/               # Experiment templates
    └── ai-coding.json       # Ships with tool
```

### Git-Based Version Control

The entire `~/.config/devex/` directory is initialized as a git repository. This provides:
- Version history of all data
- Ability to push to a private remote for backup
- Branch-based experimentation on the tool itself
- Diff-based change tracking

The tool auto-commits on significant actions (block start/end, daily log completion) with meaningful commit messages. Users can also manually commit or push.

---

## Commands

### Global

```
devex --help
devex --version
```

### Initialization & Configuration

```
devex init [experiment-name]
```

Creates a new experiment. Prompts for:
- Experiment name (default: based on template or "my-experiment")
- Template to use (default: "blank", option: "ai-coding")
- Hypotheses (freeform, one per line, optional)
- Conditions to define

If first run, also initializes `~/.config/devex/` as a git repo.

```
devex config
```

Opens config in `$EDITOR`. Or with subcommands:

```
devex config set checkin.frequency 3        # checkins per day
devex config set checkin.prompt true        # whether to show reminder prompts
devex config add repos ~/projects/my-app    # add repo for git metrics
devex config remove repos ~/projects/old    # remove repo
devex config list                           # show current config
```

```
devex template list
devex template show <name>
devex template create <name>
```

Manage experiment templates.

---

### Experiment Management

```
devex experiment list
devex experiment switch <name>
devex experiment archive <name>
devex experiment delete <name>
```

Multiple experiments can exist; one is "active" at a time.

```
devex hypothesis add "<hypothesis>"
devex hypothesis list
devex hypothesis remove <index>
```

Manage hypotheses for current experiment.

```
devex condition add <name> [--description "..."] [--rules "..."]
devex condition list
devex condition edit <name>
devex condition remove <name>
```

Manage conditions for current experiment.

---

### Block Management

```
devex block start <condition> [--duration <days>] [--tags <tag1,tag2>]
```

Starts a new block. `<condition>` must be defined in the experiment.

- Default duration: 14 days
- Displays condition rules/description for confirmation
- Fails if a block is already active

```
devex block end
```

Ends current block. Prompts for block summary:
- How would you describe this block?
- What surprised you?
- What confirmed your expectations?

Triggers metric computation for the block's date range.

```
devex block extend <days>
```

Extends current block's expected duration.

```
devex block status
```

Shows current block info: condition, day X of Y, start date, tags.

```
devex block list [--experiment <name>]
```

Lists all blocks with dates, conditions, and status.

---

### Data Capture

```
devex checkin
```

Interactive micro checkin. Questions are configurable per experiment. Default prompts:

```
[Block: no-ai | Day 12]

Energy (1-5): _
Focus (1-5): _
Stuck? (y/n): _
  → How long (minutes)?: _
One word to describe right now: _

✓ Checkin logged at 2:34 PM
```

All prompts accept Enter for default/skip. Designed to complete in <30 seconds.

```
devex checkin --quick
```

Logs a neutral checkin (all defaults) instantly. For when you want to record "I was here" without detail.

```
devex daily
```

End-of-day log. Default prompts:

```
[Block: no-ai | 2025-01-15]

What did you ship today?
> _

What did you struggle with?
> _

Ratings (1-5, Enter to skip):
  Confidence in today's code: _
  Understanding of today's code: _
  Fulfillment: _
  Enjoyment: _
  Cognitive load: _

Task types (r=routine, i=integrative, c=creative): _

Notes (optional):
> _

✓ Daily log saved
```

```
devex weekly
```

Weekly reflection. Longer prompts:

```
[Block: no-ai | Week 2]

What shipped this week?
> _

What patterns are you noticing?
> _

What's frustrating you?
> _

What's delighting you?
> _

How do you feel about your work/codebase right now?
> _

Are you looking forward to next week? Why/why not?
> _

Anything you'd do differently?
> _

Ratings (1-5):
  Productivity: _
  Quality of work: _
  Fulfillment: _
  Mental clarity: _

✓ Weekly reflection saved
```

```
devex log [message]
```

Append to dev log. If message provided, appends immediately:

```
$ devex log "Finally cracked the caching bug after 2 hours"
✓ Logged at 3:45 PM
```

If no message, opens prompt. Works without an active block.

```
devex violation [note]
```

Records a rule violation for the current block. Prompts for details if no note provided. Important for data integrity.

---

### Metrics & Analysis

```
devex metrics [--block <name>] [--repo <path>]
```

Computes/displays git metrics. Shows for current block by default.

```
Git Metrics: no-ai-1 (Jan 6 - Jan 20)
──────────────────────────────────────
Commits:           47
Lines added:       +1,842
Lines removed:     -623
Files changed:     89
Test files:        12
Doc files:         4
Avg commits/day:   3.4
```

If no repos configured, displays: "No repositories configured. Add with: devex config add repos <path>"

```
devex metrics refresh [--block <name>]
```

Forces recomputation of metrics (normally cached).

```
devex report [--block <name>]
```

Generates analysis report for a single block:

```
╭─────────────────────────────────────────────────────────────╮
│  Report: no-ai-1 (Jan 6 - Jan 20) — Condition: no-ai        │
╰─────────────────────────────────────────────────────────────╯

GIT METRICS
  Commits: 47            Lines: +1,842 / -623
  Test files: 12         Doc files: 4

CHECK-INS (34 entries, 2.4/day)
  Energy:    3.2 avg     Focus: 3.6 avg
  Stuck:     24%         Avg stuck time: 18 min
  Prompted:  42          Completed: 34 (81%)

DAILY RATINGS (14 entries)
  Confidence:     3.8    Understanding: 4.1
  Fulfillment:    3.9    Enjoyment: 3.4
  Cognitive Load: 3.7

TASK DISTRIBUTION
  Routine: 42%    Integrative: 35%    Creative: 23%

TOP WORDS
  focused (4), grinding (3), slow (3), satisfied (2)

VIOLATIONS: 1
```

```
devex compare <block1> <block2> [--block3...]
```

Generates comparison report:

```
Comparison: no-ai-1 vs full-ai-1
═══════════════════════════════════════════════════════════

                        no-ai-1     full-ai-1    Δ
────────────────────────────────────────────────────────────
Commits                 47          68           +45%
Lines changed           2,465       3,891        +58%
Test files changed      12          18           +50%
Avg commits/day         3.4         4.9          +44%

Energy                  3.2         3.4          +0.2
Focus                   3.6         3.1          -0.5
Stuck %                 24%         18%          -6%

Confidence              3.8         3.5          -0.3
Understanding           4.1         3.2          -0.9
Fulfillment             3.9         3.6          -0.3
Enjoyment               3.4         3.8          +0.4

Violations              1           3            +2
────────────────────────────────────────────────────────────

HYPOTHESIS EVALUATION
Based on data collected:

H1: "I ship more code with AI"
    → SUPPORTED: +45% commits, +58% lines changed

H2: "I retain less understanding with AI"  
    → SUPPORTED: Understanding rating -0.9

H3: "I am more fulfilled with moderate AI use"
    → INCONCLUSIVE: Need moderate-ai block data
```

```
devex export [--format json|csv] [--output <file>]
```

Exports all experiment data for external analysis.

```
devex summary
```

Quick overview of current state:

```
Experiment: ai-coding
Current block: no-ai-1 (Day 12 of 14)

Today:
  ✓ 2 checkins logged
  ○ Daily log pending

This week:
  ✓ 8 checkins (target: 10-15)
  ○ Weekly reflection due in 2 days

Repositories tracked: 2
  ~/projects/breakline
  ~/projects/portfolio
```

---

### Utilities

```
devex remind
```

Shows what's due/overdue:

```
⚠ Daily log missing for yesterday (Jan 14)
⚠ Weekly reflection due today
⚠ Block ending in 2 days — consider scheduling wrap-up
✓ 2 checkins today (next suggested: ~2:00 PM)
```

```
devex edit <type> [identifier]
```

Opens data file in `$EDITOR`:

```
devex edit daily 2025-01-15
devex edit checkin 2025-01-15
devex edit weekly 2025-W03
devex edit block no-ai-1
devex edit config
devex edit experiment
```

```
devex git <git-args>
```

Passes through to git in the data directory:

```
devex git status
devex git log --oneline -10
devex git remote add origin git@github.com:user/devex-data.git
devex git push
```

```
devex backup [--remote <name>]
```

Commits current state and pushes to remote (if configured):

```
$ devex backup
Committing: 3 checkins, 1 daily log
Pushing to origin...
✓ Backup complete
```

---

## Data Schemas

### Global Config (`config.json`)

```typescript
interface GlobalConfig {
  version: number;
  activeExperiment: string | null;
  dataDir: string;                    // usually ~/.config/devex
  
  defaults: {
    blockDuration: number;            // days, default: 14
    checkinFrequency: number;         // per day, default: 3
    checkinPrompts: boolean;          // show reminders, default: true
  };
  
  repositories: string[];             // paths to repos for git metrics
  
  git: {
    autoCommit: boolean;              // default: true
    commitOnBlockEnd: boolean;
    commitOnDailyLog: boolean;
  };
}
```

### Experiment (`experiment.json`)

```typescript
interface Experiment {
  version: number;
  name: string;
  description?: string;
  createdAt: string;                  // ISO datetime
  template?: string;                  // template used to create
  
  hypotheses: string[];
  
  conditions: {
    [name: string]: {
      description: string;
      allowed?: string[];
      forbidden?: string[];
      notes?: string;
    };
  };
  
  // Custom questions (if not using defaults)
  prompts?: {
    checkin?: PromptDefinition[];
    daily?: PromptDefinition[];
    weekly?: PromptDefinition[];
  };
}

interface PromptDefinition {
  id: string;
  question: string;
  type: 'rating' | 'boolean' | 'text' | 'choice';
  options?: string[];                 // for choice type
  min?: number;                       // for rating
  max?: number;
  required: boolean;
  default?: any;
}
```

### Block

```typescript
interface Block {
  id: string;                         // e.g., "no-ai-1"
  condition: string;
  tags: string[];
  
  startDate: string;                  // ISO datetime
  endDate?: string;                   // ISO datetime, null if active
  expectedDuration: number;           // days
  
  summary?: {
    description: string;
    surprises: string;
    confirmedExpectations: string;
    completedAt: string;
  };
  
  metrics?: GitMetrics;               // cached when block ends
}
```

### Checkin

```typescript
interface Checkin {
  id: string;                         // uuid
  timestamp: string;                  // ISO datetime
  block: string;
  dayInBlock: number;
  
  // Core fields (always present)
  prompted: boolean;                  // was this from a prompt or manual?
  promptedAt?: string;                // when prompt was shown
  
  // Default fields (can be extended by experiment)
  energy?: number;                    // 1-5
  focus?: number;                     // 1-5
  stuck?: boolean;
  stuckMinutes?: number;
  oneWord?: string;
  
  // Extension fields from custom prompts
  custom?: Record<string, any>;
}
```

Stored as array in `checkins/YYYY-MM-DD.json`.

### Daily Log

```typescript
interface DailyLog {
  date: string;                       // YYYY-MM-DD
  block: string;
  completedAt: string;                // ISO datetime
  
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
  
  taskTypes?: ('routine' | 'integrative' | 'creative')[];
  notes?: string;
  
  // Extension fields
  custom?: Record<string, any>;
}
```

### Weekly Reflection

```typescript
interface WeeklyReflection {
  week: string;                       // YYYY-Www
  block: string;
  completedAt: string;
  
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
  custom?: Record<string, any>;
}
```

### Violation

```typescript
interface Violation {
  id: string;
  timestamp: string;
  block: string;
  note: string;
}
```

Stored in `violations.json` as array.

### Git Metrics

```typescript
interface GitMetrics {
  block: string;
  computedAt: string;
  
  dateRange: {
    start: string;
    end: string;
  };
  
  repositories: {
    [path: string]: RepoMetrics;
  };
  
  totals: RepoMetrics;
}

interface RepoMetrics {
  commits: number;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  testFilesChanged: number;
  docFilesChanged: number;
  avgCommitsPerDay: number;
  firstCommitTimes: string[];         // for procrastination analysis
}
```

---

## Default Templates

### Blank Template

Minimal starting point:

```json
{
  "name": "blank",
  "description": "Empty experiment template",
  "hypotheses": [],
  "conditions": {}
}
```

### AI Coding Template

Ships with the tool as a ready-to-use experiment:

```json
{
  "name": "ai-coding",
  "description": "Experiment to evaluate AI-assisted coding impact on productivity, quality, and satisfaction",
  
  "hypotheses": [
    "I procrastinate starting less with AI assistance",
    "I ship more code with AI assistance",
    "Code quality is slightly lower with AI but still acceptable",
    "I write more tests and documentation with AI",
    "I retain less understanding of the codebase with heavy AI use",
    "Moderate AI use is more fulfilling than no AI or full AI"
  ],
  
  "conditions": {
    "no-ai": {
      "description": "No AI assistance",
      "allowed": ["Documentation", "Stack Overflow", "Search engines", "Man pages"],
      "forbidden": ["GitHub Copilot", "ChatGPT", "Claude", "Any AI coding assistant"]
    },
    "moderate": {
      "description": "Limited AI assistance",
      "allowed": [
        "Autocomplete suggestions (Copilot)",
        "AI for planning and architecture discussion",
        "AI for explaining unfamiliar code",
        "AI for commit messages and documentation"
      ],
      "forbidden": [
        "AI-generated functions or components",
        "AI writing tests",
        "Agentic coding tools (Claude Code, Cursor Agent, etc.)"
      ]
    },
    "full-ai": {
      "description": "Full AI assistance",
      "allowed": ["Everything"],
      "forbidden": [],
      "notes": "Use AI however feels natural. Pair programming, code generation, agents, etc."
    }
  },
  
  "prompts": {
    "checkin": [
      {"id": "energy", "question": "Energy", "type": "rating", "min": 1, "max": 5, "required": false, "default": 3},
      {"id": "focus", "question": "Focus", "type": "rating", "min": 1, "max": 5, "required": false, "default": 3},
      {"id": "stuck", "question": "Stuck right now?", "type": "boolean", "required": false, "default": false},
      {"id": "stuckMinutes", "question": "How long stuck (minutes)?", "type": "number", "required": false},
      {"id": "oneWord", "question": "One word to describe right now", "type": "text", "required": false},
      {"id": "reachingForAI", "question": "Caught yourself reaching for AI?", "type": "boolean", "required": false}
    ]
  }
}
```

---

## Behavior Details

### No Active Block

Most data capture commands require an active block:

```
$ devex checkin
No active block. Start one with: devex block start <condition>

Available conditions: no-ai, moderate, full-ai
```

Exceptions:
- `devex log` works without a block (general observations)
- `devex report` and `devex compare` work on historical data

### Checkin Prompting

When `checkinPrompts` is enabled:
- Tool can integrate with system notifications (future)
- `devex remind` shows suggested checkin times
- Each checkin records whether it was prompted or manual
- Completion rate (prompted vs completed) is tracked in reports

Suggested times are spread across the workday based on `checkinFrequency`.

### Partial Data

All rating/text fields are optional. Users can skip any prompt by pressing Enter. Reports handle missing data gracefully:
- Averages computed only from present values
- "N/A" shown when insufficient data
- Completion percentages shown in reports

### Date/Time Handling

- All timestamps stored as ISO 8601 in UTC
- Displayed in local timezone
- "Today" determined by local timezone
- Week numbers use ISO week (Monday = day 1)
- Block day counting starts at 1

### Git Integration

**Data directory git**:
- Initialized automatically on first `devex init`
- Auto-commits on configurable events (block end, daily log)
- `devex git` passes through to git in data dir
- `devex backup` commits and pushes

**Repository metrics**:
- Repos added via `devex config add repos <path>`
- Metrics computed on `devex metrics` or block end
- Git commands used:

```bash
# Commit count in date range
git -C <repo> rev-list --count --after="<start>" --before="<end>" HEAD

# Detailed stats
git -C <repo> log --after="<start>" --before="<end>" --pretty=tformat: --numstat

# First commit times (for procrastination analysis)
git -C <repo> log --after="<start>" --before="<end>" --format="%aI" --reverse
```

### Speed & Defaults

Checkins should complete in <30 seconds. All prompts have defaults:
- Ratings: 3 (middle)
- Booleans: false/no
- Text: empty (skipped)

Pressing Enter accepts default. `devex checkin --quick` skips all prompts.

### Data Integrity

- JSON files are pretty-printed for human readability
- Never overwrite without warning
- Daily logs: one per day (warn if exists, offer to add notes)
- Checkins: append to daily array
- Dev log: append-only markdown
- Violations: append to array

---

## Future Considerations (Not in v1)

- **System notifications**: Native OS reminders for checkins
- **IDE integration**: VS Code extension for in-editor checkins
- **Time tracking integration**: Pull from Toggl, RescueTime, WakaTime
- **GitHub/GitLab API**: Fetch metrics via API instead of local repos
- **Charts & visualization**: HTML export with embedded charts
- **Team mode**: Aggregated experiments across multiple people
- **Import/export between machines**: Merge experiment data
- **Mobile companion**: Quick checkins from phone

---

## Implementation Notes

### Technology

- **Runtime**: Deno 2.x
- **Distribution**: JSR (primary), compiled binaries via `deno compile`
- **Dependencies**: Minimal, prefer Deno standard library

### Key Deno APIs

- `prompt()`, `confirm()` — Interactive prompts
- `Deno.readTextFile()`, `Deno.writeTextFile()` — File I/O
- `Deno.Command` — Git operations
- `@std/cli/parse-args` — Argument parsing
- `@std/datetime` — Date formatting
- `@std/path` — Path operations

### File Structure (Source)

```
src/
├── main.ts                 # Entry point, command routing
├── commands/
│   ├── init.ts
│   ├── block.ts
│   ├── checkin.ts
│   ├── daily.ts
│   ├── weekly.ts
│   ├── log.ts
│   ├── metrics.ts
│   ├── report.ts
│   └── ...
├── lib/
│   ├── config.ts           # Config read/write
│   ├── experiment.ts       # Experiment operations
│   ├── storage.ts          # Data persistence
│   ├── git.ts              # Git operations
│   ├── prompts.ts          # Interactive prompt helpers
│   └── format.ts           # Report formatting
├── schemas/
│   └── types.ts            # TypeScript interfaces
└── templates/
    ├── blank.json
    └── ai-coding.json
```

---

## Open Questions

1. **Config location**: `~/.config/devex/` vs `~/.devex/`? XDG compliance suggests the former, but dotfile in home is more traditional.

2. **Multiple active experiments**: Allow or enforce single active? Current spec assumes single active but multiple can exist.

3. **Checkin scheduling**: How sophisticated should prompting be? Simple interval vs. smart scheduling based on git activity?

4. **Sync/backup**: Should we build in cloud sync, or rely on users setting up git remotes?

5. **Privacy**: Any data that should be explicitly excluded from git commits? (Probably not, but worth considering.)
