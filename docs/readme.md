# devex

A CLI for developers to run structured self-experiments on their workflow, productivity, and experience.

Define hypotheses, work in time-boxed blocks under different conditions, and collect both subjective (checkins, reflections) and objective (git metrics) data to evaluate your hypotheses.

While `devex` ships with a default "AI-assisted coding" experiment template (and is ultimately the original purpose), it is designed to support any workflow experiment: editor changes, work schedule variations, music/environment, methodology shifts, etc.

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

## commands

| Command | Description |
|---------|-------------|
| `devex status` | Dashboard showing progress and next actions |
| `devex init` | Create a new experiment (sets up reminders too) |
| `devex block start/end/list` | Manage time-boxed work blocks |
| `devex checkin` | Quick check-in (energy, focus, stuck) |
| `devex daily` | End-of-day reflection |
| `devex weekly` | End-of-week reflection |
| `devex log [msg]` | Append to dev log |
| `devex config` | Manage settings |
| `devex edit <target>` | Open data files in $EDITOR |
| `devex metrics` | Compute git metrics for a block |
| `devex report` | Generate analysis report |
| `devex compare` | Compare metrics between blocks |
| `devex export` | Export all data as JSON |

## roadmap

- [x] Milestone 1: Core loop (init, block, checkin, daily, log)
- [x] Milestone 2: Git foundation (auto-commit, sync, backup)
- [x] Milestone 3: Analysis & reporting (metrics, reports, compare)
- [x] Milestone 4: Polish & completeness (weekly, config, edit, export, status, reminders)
- [ ] Milestone 5: Distribution (JSR, compiled binaries)

## future ideas

### prioritized

- **AI observability** - Hook into LLM/agent prompts for reflection. Record inputs, timestamps, tokens to a local database for analysis and pattern recognition.
- **Metrics upload** - Optional upload to a hosted site for aggregated insights. Privacy-preserving: no code or logs, just metrics. Manual form or automated CLI integration.

### exploratory

- **Streaks & insights** - Track consistency, surface patterns automatically
- **Cross-experiment comparison** - Compare results across different experiments
- **IDE integration** - VS Code extension for in-editor check-ins
