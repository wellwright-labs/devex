# pulse

A CLI for developers to run structured self-experiments on their workflow, productivity, and experience.

Define hypotheses, work in time-boxed blocks under different conditions, and collect both subjective (checkins, reflections) and objective (git metrics) data to evaluate your hypotheses.

While `pulse` ships with a default "AI-assisted coding" experiment template (and is ultimately the original purpose), it is designed to support any workflow experiment: editor changes, work schedule variations, music/environment, methodology shifts, etc.

## roadmap

`pulse` is still in pre-alpha. I'm intentionally keeping scope small, so shouldn't take long to get to alpha. But if you're here early, beware the codebase is still quite unstable/in early development.

- [x] Milestone 1: Core loop (init, block, checkin, daily, log)
- [ ] Milestone 2: Git foundation (auto-commit, backup)
- [ ] Milestone 3: Analysis & reporting (metrics, reports, compare)
- [ ] Milestone 4: Polish & completeness (weekly, config, edit, export)
- [ ] Milestone 5: Distribution (JSR, compiled binaries)
- [ ] Add AI observability (e.g. hook into agents and record prompt inputs, timestamp, tokens, etc)

## future improvements

UX polish identified during milestone 1 validation:

1. **Better prompt defaults** - Show defaults as grayed placeholder text in the input field rather than `[default]` suffix
2. **Interactive select for choices** - Use arrow-key navigation for multiple choice prompts instead of numbered list
3. **Richer init output** - After creating experiment, show hypotheses list and condition summaries; mention that data dir is a git repo with auto-commit
4. **Guided next steps** - After each command, suggest the logical next action (e.g., "Next: pulse block start <condition>")
5. **Editor integration for log** - Open `pulse log` in $EDITOR when available, fall back to terminal input
6. **Explain task types** - Add help text or prompt hint explaining routine/integrative/creative task types in daily log
