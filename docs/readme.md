# pulse

A CLI for developers to run structured self-experiments on their workflow, productivity, and experience.

Define hypotheses, work in time-boxed blocks under different conditions, and collect both subjective (checkins, reflections) and objective (git metrics) data to evaluate your hypotheses.

While `pulse` ships with a default "AI-assisted coding" experiment template (and is ultimately the original purpose), it is designed to support any workflow experiment: editor changes, work schedule variations, music/environment, methodology shifts, etc.

## quick start

```bash
# Create an experiment
pulse init

# Start a block under a condition
pulse block start no-ai

# Throughout the day
pulse status              # See dashboard and what's due
pulse checkin             # Quick check-in (3x/day recommended)
pulse log "Fixed the auth bug"  # Freeform notes

# End of day
pulse daily

# End of week
pulse weekly

# End of block
pulse block end
pulse report              # See analysis
```

## commands

| Command | Description |
|---------|-------------|
| `pulse status` | Dashboard showing progress and next actions |
| `pulse init` | Create a new experiment (sets up reminders too) |
| `pulse block start/end/list` | Manage time-boxed work blocks |
| `pulse checkin` | Quick check-in (energy, focus, stuck) |
| `pulse daily` | End-of-day reflection |
| `pulse weekly` | End-of-week reflection |
| `pulse log [msg]` | Append to dev log |
| `pulse config` | Manage settings |
| `pulse edit <target>` | Open data files in $EDITOR |
| `pulse metrics` | Compute git metrics for a block |
| `pulse report` | Generate analysis report |
| `pulse compare` | Compare metrics between blocks |
| `pulse export` | Export all data as JSON |

## roadmap

- [x] Milestone 1: Core loop (init, block, checkin, daily, log)
- [x] Milestone 2: Git foundation (auto-commit, sync, backup)
- [x] Milestone 3: Analysis & reporting (metrics, reports, compare)
- [x] Milestone 4: Polish & completeness (weekly, config, edit, export, status, reminders)
- [ ] Milestone 5: Distribution (JSR, compiled binaries)

## future ideas

- **AI observability** - Hook into agents and record prompt inputs, timestamps, tokens, etc.
- **Streaks & insights** - Track consistency, surface patterns automatically
- **Cross-experiment comparison** - Compare results across different experiments
- **IDE integration** - VS Code extension for in-editor check-ins
