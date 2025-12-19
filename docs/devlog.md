# devlog

## 12.18.25

milestone 4 complete

### zero-dep interactive prompts
implemented arrow-key navigation and better UX without adding dependencies:
- `src/lib/tty.ts` - raw terminal mode + ANSI escape codes
- select menus with up/down navigation
- rating inputs (1-5) with left/right adjustment
- yes/no confirms with visual highlighting
- text inputs with placeholder display
- non-TTY fallbacks for CI/scripting

### reminder system
check-in reminders via launchd (macOS) or cron (Linux):
- integrated into `devex init` ("Set up check-in reminders?")
- shell scripts that only notify when there's an active block
- respects checkinFrequency config (default: 3x per workday)
- native OS notifications via osascript/notify-send

### new commands
- `devex status` - dashboard with smart "Next" recommendation and timing
- `devex weekly` - weekly reflection prompts
- `devex config` - manage settings (list, set, add/remove repos)
- `devex edit` - open data files in $EDITOR
- `devex export` - export all experiment data as JSON

### bug fixes
- git repo now always initialized (was only on first run)
- fixed repos path bug (trailing dot)
- removed duplicate functionality (devlog from edit, editor from log)

### dev tooling
- added `deno task clean` for development reset

---

## 12.13.25

okay, basic idea and spec are in

wrote prompt for planning

planned and answered cc questions

scaffolded deno.json

checking deno.json

versions of std look good, moving on

init src folders

init types / domain modelling

reviewing types

initial experiment type looks weird

```
export interface Experiment {
  version: number;
  name: string;
  description?: string;
  createdAt: string; // ISO datetime
  template?: string; // template used to create

  hypotheses: string[];

  conditions: Record<string, Condition>;

  // Custom questions (if not using defaults)
  prompts?: {
    checkin?: PromptDefinition[];
    daily?: PromptDefinition[];
    weekly?: PromptDefinition[];
  };

  // Linked repo for in-repo mode
  linkedRepo?: string;
}
```

I'm thinking perhaps the "in repo"mode is not very helpful and adds unwarranted complexity. I may remove from V1. 

decided to remove from v1 + add decision log

moved string dates to typed dates, will layer DTO for json serialization if needed

updated docs

updated cc plan

created decision log

impl config

impl state

impl prompts

impl lib/format

impl templates/blank

impl templates/ai-coding

impl commands/init

impl main

validate --help

impl block

impl daily

impl checkin

impl log

reviewing milestone 1 code

remove version const from main, use manifest

rewrite commands to include validators & validate inputs

reviewed more code

moved tests to __tests__

review review review

add tests

fmt

update fmt to exclude md (deno bastardizes md)

add tests

