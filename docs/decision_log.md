# Decision Log

Architectural and design decisions for Devex, with rationale.

---

## 001: Use Date objects in TypeScript types

**Date**: 2025-01-13
**Status**: Accepted

### Context

The spec originally used `string` (ISO 8601 format) for all datetime fields. This works for JSON serialization but provides no type safety for date operations.

### Decision

Use `Date` objects in all runtime TypeScript types. The storage layer handles serialization:
- Writing: `Date` → ISO string via JSON replacer
- Reading: ISO string → `Date` via JSON reviver

### Consequences

**Positive**:
- Better type safety — can't accidentally pass a non-date string
- Native date operations without parsing (comparisons, day calculations)
- IDE autocomplete shows Date methods

**Negative**:
- Must be careful that date strings like `"2025-01-15"` (YYYY-MM-DD for file names) are NOT converted
- ISO pattern detection in reviver could theoretically have false positives (unlikely in practice)

### Implementation

- Added `dateReviver` and `dateReplacer` functions to `storage.ts`
- Pattern matches: `YYYY-MM-DDTHH:mm:ss.sssZ` or `YYYY-MM-DDTHH:mm:ssZ`
- Does NOT match date-only strings like `"2025-01-15"` (used for file names)

---

## 002: Remove in-repo mode

**Date**: 2025-01-13
**Status**: Accepted

### Context

The original spec included an "in-repo mode" (`devex init --in-repo`) that would:
- Create a `.devex/` directory in the current repo
- Add it to `.gitignore`
- Link that experiment to the repo's git history for metrics

### Decision

Remove in-repo mode entirely. All experiments live in `~/.config/devex/`.

### Rationale

1. **Adds complexity for marginal benefit**: Users can already configure repositories for git metrics via `devex config add repos <path>`. In-repo mode just changes where data is stored.

2. **Data locality is a false benefit**: Having experiment data in the repo sounds appealing but:
   - It clutters the repo with a `.devex/` directory
   - Data still shouldn't be committed (sensitive reflections)
   - Makes experiments harder to find/manage if scattered across repos

3. **Simpler mental model**: One location for all Devex data. Users don't have to remember where each experiment lives.

4. **Easier to implement**: No need to handle two data location modes, no path resolution complexity, no `.gitignore` manipulation.

### Consequences

**Positive**:
- Simpler codebase
- Single source of truth for all experiment data
- Easier backup (one directory)
- Removed ~15 lines from spec, reduced risk area in plan

**Negative**:
- Can't keep experiment data "with" a specific project
- Users who wanted this feature won't have it (but can revisit if demand emerges)

### Migration

None needed — feature was never implemented.
