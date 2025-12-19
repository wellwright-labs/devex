# devex

A CLI for developers to run structured self-experiments on their workflow, productivity, and experience.

Define hypotheses, work in time-boxed blocks under different conditions, and collect both subjective (checkins, reflections) and objective (git metrics) data to evaluate your hypotheses.

While `devex` ships with a default "AI-assisted coding" experiment template (and is ultimately the original purpose), it is designed to support any workflow experiment: editor changes, work schedule variations, music/environment, methodology shifts, etc.

> devex is in alpha / dogfooding stage -- I expect bugs and contributions / ideas are welcome

## install

```bash
# Via Homebrew (macOS/Linux)
brew install wellwright-labs/devex/devex

# Via Deno
deno install -g -A -n devex jsr:@wellwright/devex

# Via curl (downloads pre-built binary)
curl -fsSL https://raw.githubusercontent.com/wellwright-labs/devex/main/install.sh | sh

# Download binary directly
# https://github.com/wellwright-labs/devex/releases

# Build from source
git clone https://github.com/wellwright-labs/devex.git
cd devex && deno task compile
```

## quick start

```bash
# Create an experiment
devex init

# Start a block under a condition
devex block start no-ai

# Throughout the day
devex status              # See dashboard and what's due
devex checkin             # Quick check-in (3x/day recommended)
devex log "Fixed the auth bug"  # Freeform notes

# End of day
devex daily

# End of week
devex weekly

# End of block
devex block end
devex report              # See analysis
```

## setting up an experiment

When you run `devex init`, you'll be guided through creating an experiment:

1. **Choose a template** - Start with `ai-coding` (pre-configured for AI assistance experiments) or `blank` (define everything yourself)

2. **Define hypotheses** - What do you want to learn? These are the questions your experiment aims to answer. Example hypotheses from the AI coding template:
   - "I ship more code with AI assistance"
   - "I procrastinate starting less with AI assistance"
   - "Moderate AI use is more fulfilling than no AI or full AI"

3. **Define conditions** - The different states you'll compare. Each condition describes what's allowed/forbidden. Example conditions:
   - `no-ai`: No AI assistance (documentation and search only)
   - `moderate`: Limited AI (autocomplete, planning discussions, no code generation)
   - `full-ai`: Unrestricted AI use

4. **Set up reminders** - Optional check-in reminders via system notifications (macOS LaunchD / Linux cron)

### experiment workflow

```
┌─────────────────────────────────────────────────────────┐
│                    EXPERIMENT                           │
│                                                         │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐               │
│   │ Block 1 │   │ Block 2 │   │ Block 3 │   ...         │
│   │ (no-ai) │   │(full-ai)│   │(moderate│               │
│   └────┬────┘   └────┬────┘   └────┬────┘               │
│        │             │             │                    │
│   checkins      checkins      checkins                  │
│   daily         daily         daily                     │
│   weekly        weekly        weekly                    │
│   git metrics   git metrics   git metrics               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Each **block** is a focused period (e.g. 1-5 days) working under a single condition. During a block:

- Do **check-ins** 2-3x per day (quick energy/focus ratings)
- Write a **daily** reflection at end of day
- Write a **weekly** reflection at end of week
- **Git metrics** are computed automatically from your commits

After completing blocks under different conditions, use `devex report` and `devex compare` to analyze results.

### data storage

All data lives in `~/.config/devex/` as a git repository:

```
~/.config/devex/
├── config.json           # Global settings
└── experiments/
    └── my-experiment/
        ├── experiment.json   # Hypotheses, conditions
        ├── blocks/           # Block data
        ├── checkins/         # Check-in responses
        ├── daily/            # Daily reflections
        ├── weekly/           # Weekly reflections
        └── devlog.md         # Freeform notes
```

Changes are auto-committed to git. Use `devex sync` to push to a remote for backup.

### tracking git metrics

To track objective coding metrics, configure the repositories you work in:

```bash
# Add local repositories
devex config add repos ~/projects/my-app
devex config add repos ~/projects/backend

# Or GitHub repositories (requires GITHUB_TOKEN for private repos)
devex config add repos owner/repo
```

When you run `devex metrics`, devex analyzes commits made to these repos during the block's timeframe and computes:
- Commit count and frequency
- Lines added/removed
- Files changed (including test and doc files specifically)

### analyzing results

After completing blocks, you have several ways to analyze your data:

| Command | Purpose |
|---------|---------|
| `devex metrics` | Compute raw git stats for one block |
| `devex report` | Full analysis of one block (git + check-ins + daily ratings) |
| `devex compare block1 block2` | Side-by-side comparison of two blocks with deltas |
| `devex export` | Export all experiment data as JSON for external analysis |

**`report`** combines:
- Git metrics (commits, lines, test/doc files)
- Check-in aggregates (avg energy/focus, stuck %, top words)
- Daily ratings (confidence, understanding, fulfillment, enjoyment, cognitive load)
- Task type distribution (routine vs integrative vs creative work)

**`compare`** shows the same metrics for two blocks in columns, with a delta column showing the difference. It also lists your hypotheses for manual evaluation against the data.

## commands

| Command                      | Description                                     |
| ---------------------------- | ----------------------------------------------- |
| `devex status`               | Dashboard showing progress and next actions     |
| `devex init`                 | Create a new experiment (sets up reminders too) |
| `devex block start/end/list` | Manage time-boxed work blocks                   |
| `devex checkin`              | Quick check-in (energy, focus, stuck)           |
| `devex daily`                | End-of-day reflection                           |
| `devex weekly`               | End-of-week reflection                          |
| `devex log [msg]`            | Append to dev log                               |
| `devex config`               | Manage settings                                 |
| `devex edit <target>`        | Open data files in $EDITOR                      |
| `devex metrics`              | Compute git metrics for a block                 |
| `devex report`               | Generate analysis report                        |
| `devex compare`              | Compare metrics between blocks                  |
| `devex export`               | Export all data as JSON                         |

## roadmap

- [x] Milestone 1: Core loop (init, block, checkin, daily, log)
- [x] Milestone 2: Git foundation (auto-commit, sync, backup)
- [x] Milestone 3: Analysis & reporting (metrics, reports, compare)
- [x] Milestone 4: Polish & completeness (weekly, config, edit, export, status, reminders)
- [x] Milestone 5: Distribution (JSR, Homebrew, compiled binaries)
- [ ] Milestone 6: Git metrics accuracy & polish
  - [ ] Filter git commits by author (currently counts all commits)
  - [ ] Support configurable branch per repo (currently uses HEAD)
  - [ ] Add experiment list/switch commands
  - [ ] Document known limitations

## known limitations

- **Git metrics count all commits**: Currently counts all commits in configured repos during the block timeframe, not just yours. Author filtering coming in Milestone 6.
- **Branch handling**: Git analysis runs on the current branch (HEAD). No branch configuration yet. This limits accuracy for repos using squash merging or complex branching strategies.
- **Duplicate repo detection**: If you add the same repo both as a local path and GitHub URL, commits will be double-counted.
- **Multiple experiments**: You can have multiple experiments, but there's no `list` or `switch` command yet. To switch, edit `activeExperiment` in `~/.config/devex/config.json`.

## future ideas

### prioritized

- **AI observability** - Hook into LLM/agent prompts for reflection. Record inputs, timestamps, tokens to a local database for analysis and pattern recognition.
- **Metrics upload** - Optional upload to a hosted site for aggregated insights. Privacy-preserving: no code or logs, just metrics. Manual form or automated CLI integration.

### exploratory

- **Streaks & insights** - Track consistency, surface patterns automatically
- **Cross-experiment comparison** - Compare results across different experiments
- **IDE integration** - Zed/neovim/VS Code/helix/etc extensions for in-editor check-ins
