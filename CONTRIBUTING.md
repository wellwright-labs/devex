# Contributing to devex

## Development Setup

```bash
# Clone the repo
git clone https://github.com/wellwright-labs/devex.git
cd devex

# Run in development mode
deno task dev <command>

# Run tests
deno task test

# Type check
deno task check

# Full build (check + test + compile)
deno task build
```

## Project Structure

```
src/
├── main.ts           # CLI entry point
├── commands/         # Command implementations
├── lib/              # Shared utilities
├── templates/        # Experiment templates (JSON)
├── types/            # TypeScript type definitions
└── __test__/         # Tests
```

## Release Process

Releases are manual but automated workflows handle building and distribution.

### Pre-release Checklist

1. Ensure all tests pass: `deno task build`
2. Update version in `deno.json`
3. Commit changes: `git commit -m "chore: bump version to vX.Y.Z"`
4. Push to main: `git push`

### Creating a Release

1. Go to [GitHub Releases](https://github.com/wellwright-labs/devex/releases)
2. Click "Draft a new release"
3. Create a new tag matching the version (e.g., `v0.1.6`)
4. Write release notes
5. Publish release

### What Happens Automatically

When a release is published:

1. **Binary compilation** (`release.yml`)
   - Compiles for macOS (x64, arm64), Linux (x64, arm64), Windows (x64)
   - Attaches binaries to the GitHub release

2. **JSR publishing** (`publish.yml`)
   - Publishes the package to [jsr.io/@wellwright/devex](https://jsr.io/@wellwright/devex)

3. **Homebrew formula update** (`release.yml`)
   - Computes SHA256 checksums for new binaries
   - Updates the formula in [homebrew-devex](https://github.com/wellwright-labs/homebrew-devex)
   - Commits and pushes automatically

### Version Sync

The version in `deno.json` must match the git tag for JSR publishing to work correctly. Always update `deno.json` before creating a release tag.

### Secrets Required

The following secrets are configured in the repository:

- `HOMEBREW_TAP_TOKEN` - GitHub PAT with write access to the homebrew-devex repo

## Testing Install Methods

After a release, verify all install methods work:

```bash
# Deno
deno uninstall devex
deno install -g -A -n devex jsr:@wellwright/devex
devex --version

# Homebrew
brew uninstall devex
brew update
brew install wellwright-labs/devex/devex
devex --version

# Curl
sudo rm /usr/local/bin/devex
curl -fsSL https://raw.githubusercontent.com/wellwright-labs/devex/main/install.sh | sh
devex --version
```

## Code Style

- Use Deno's built-in formatter: `deno fmt`
- Use Deno's built-in linter: `deno lint`
- TypeScript strict mode is enabled
- Zero external dependencies (Deno std library only)
