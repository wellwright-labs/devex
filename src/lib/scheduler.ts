/**
 * Scheduler utilities for setting up reminder notifications
 * Handles launchd (macOS) and cron (Linux) setup
 */

import { join } from "@std/path";
import { ensureDir, fileExists } from "./storage.ts";

const LAUNCHD_LABEL = "com.pulse.remind";

/**
 * Calculate interval in minutes from checkinFrequency (per 8-hour day)
 */
export function getIntervalMinutes(frequency: number): number {
  const workdayMinutes = 8 * 60; // 480 minutes
  return Math.round(workdayMinutes / frequency);
}

/**
 * Get path to launchd plist
 */
function getLaunchdPlistPath(): string {
  const home = Deno.env.get("HOME") || "";
  return join(home, "Library", "LaunchAgents", `${LAUNCHD_LABEL}.plist`);
}

/**
 * Get path to the remind script
 */
function getRemindScriptPath(): string {
  const home = Deno.env.get("HOME") || "";
  return join(home, ".config", "pulse", "remind-runner.sh");
}

/**
 * Install reminder scheduler
 * Returns true if successful
 */
export async function installScheduler(
  intervalMinutes: number,
): Promise<boolean> {
  const platform = Deno.build.os;

  if (platform === "darwin") {
    return await installLaunchd(intervalMinutes);
  } else if (platform === "linux") {
    return await installCron(intervalMinutes);
  }

  return false;
}

/**
 * Uninstall reminder scheduler
 */
export async function uninstallScheduler(): Promise<boolean> {
  const platform = Deno.build.os;

  if (platform === "darwin") {
    return await uninstallLaunchd();
  } else if (platform === "linux") {
    return await uninstallCron();
  }

  return false;
}

/**
 * Check if scheduler is installed
 */
export async function isSchedulerInstalled(): Promise<boolean> {
  const platform = Deno.build.os;

  if (platform === "darwin") {
    return await fileExists(getLaunchdPlistPath());
  } else if (platform === "linux") {
    return await isCronInstalled();
  }

  return false;
}

// =============================================================================
// macOS launchd
// =============================================================================

async function installLaunchd(intervalMinutes: number): Promise<boolean> {
  try {
    const plistPath = getLaunchdPlistPath();
    const scriptPath = getRemindScriptPath();

    // Ensure directories exist
    const launchAgentsDir = join(
      Deno.env.get("HOME") || "",
      "Library",
      "LaunchAgents",
    );
    await ensureDir(launchAgentsDir);

    // Create the runner script
    // Checks for active block before sending notification
    const remindScript = `#!/bin/bash
# Pulse reminder runner
PULSE_DIR="$HOME/.config/pulse"
CONFIG="$PULSE_DIR/config.json"

# Check if pulse is set up and has an active experiment
if [ ! -f "$CONFIG" ]; then
  exit 0
fi

# Parse active experiment from config (simple grep, avoids jq dependency)
ACTIVE=$(grep -o '"activeExperiment"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG" 2>/dev/null | cut -d'"' -f4)
if [ -z "$ACTIVE" ] || [ "$ACTIVE" = "null" ]; then
  exit 0
fi

# Check if there's an active block (any block file without endDate)
BLOCKS_DIR="$PULSE_DIR/experiments/$ACTIVE/blocks"
if [ ! -d "$BLOCKS_DIR" ]; then
  exit 0
fi

# Look for a block that doesn't have an endDate (active block)
HAS_ACTIVE_BLOCK=false
for block in "$BLOCKS_DIR"/*.json; do
  [ -f "$block" ] || continue
  if ! grep -q '"endDate"' "$block" 2>/dev/null; then
    HAS_ACTIVE_BLOCK=true
    break
  fi
done

if [ "$HAS_ACTIVE_BLOCK" = "true" ]; then
  osascript -e 'display notification "Time for a quick check-in. Run: pulse checkin" with title "Pulse"' 2>/dev/null
fi
`;

    await Deno.writeTextFile(scriptPath, remindScript);
    await Deno.chmod(scriptPath, 0o755);

    // Create launchd plist
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LAUNCHD_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${scriptPath}</string>
    </array>
    <key>StartInterval</key>
    <integer>${intervalMinutes * 60}</integer>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>`;

    await Deno.writeTextFile(plistPath, plist);

    // Load the job
    const command = new Deno.Command("launchctl", {
      args: ["load", plistPath],
      stdout: "null",
      stderr: "null",
    });
    await command.output();

    return true;
  } catch {
    return false;
  }
}

async function uninstallLaunchd(): Promise<boolean> {
  try {
    const plistPath = getLaunchdPlistPath();
    const scriptPath = getRemindScriptPath();

    // Unload the job
    const command = new Deno.Command("launchctl", {
      args: ["unload", plistPath],
      stdout: "null",
      stderr: "null",
    });
    await command.output();

    // Remove files
    try {
      await Deno.remove(plistPath);
    } catch { /* ignore */ }

    try {
      await Deno.remove(scriptPath);
    } catch { /* ignore */ }

    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Linux cron
// =============================================================================

async function installCron(intervalMinutes: number): Promise<boolean> {
  try {
    // Get current crontab
    const getCron = new Deno.Command("crontab", {
      args: ["-l"],
      stdout: "piped",
      stderr: "null",
    });
    const { stdout } = await getCron.output();
    let crontab = new TextDecoder().decode(stdout);

    // Remove any existing pulse entries
    crontab = crontab
      .split("\n")
      .filter((line) => !line.includes("# pulse-remind"))
      .join("\n");

    // Calculate cron schedule (approximate the interval during work hours)
    let schedule: string;
    if (intervalMinutes <= 60) {
      schedule = "0 9-17 * * 1-5"; // Every hour 9am-5pm weekdays
    } else if (intervalMinutes <= 120) {
      schedule = "0 9,11,13,15,17 * * 1-5"; // Every 2 hours
    } else {
      schedule = "0 10,14,17 * * 1-5"; // 3x per day
    }

    // Add new entry - uses a script to check for active block first
    const scriptPath = getRemindScriptPath().replace(/\.sh$/, "-linux.sh");
    const script = `#!/bin/bash
# Pulse reminder runner (Linux)
PULSE_DIR="$HOME/.config/pulse"
CONFIG="$PULSE_DIR/config.json"

[ -f "$CONFIG" ] || exit 0

ACTIVE=$(grep -o '"activeExperiment"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG" 2>/dev/null | cut -d'"' -f4)
[ -z "$ACTIVE" ] || [ "$ACTIVE" = "null" ] && exit 0

BLOCKS_DIR="$PULSE_DIR/experiments/$ACTIVE/blocks"
[ -d "$BLOCKS_DIR" ] || exit 0

for block in "$BLOCKS_DIR"/*.json; do
  [ -f "$block" ] || continue
  if ! grep -q '"endDate"' "$block" 2>/dev/null; then
    # Has active block, send notification
    if command -v notify-send >/dev/null 2>&1; then
      notify-send "Pulse" "Time for a quick check-in. Run: pulse checkin"
    fi
    exit 0
  fi
done
`;
    await Deno.writeTextFile(scriptPath, script);
    await Deno.chmod(scriptPath, 0o755);

    const entry = `${schedule} ${scriptPath} # pulse-remind`;
    crontab = crontab.trim() + "\n" + entry + "\n";

    // Write new crontab
    const setCron = new Deno.Command("crontab", {
      args: ["-"],
      stdin: "piped",
      stdout: "null",
      stderr: "null",
    });
    const process = setCron.spawn();
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(crontab));
    await writer.close();
    await process.status;

    return true;
  } catch {
    return false;
  }
}

async function uninstallCron(): Promise<boolean> {
  try {
    // Get current crontab
    const getCron = new Deno.Command("crontab", {
      args: ["-l"],
      stdout: "piped",
      stderr: "null",
    });
    const { stdout } = await getCron.output();
    let crontab = new TextDecoder().decode(stdout);

    // Remove pulse entries
    crontab = crontab
      .split("\n")
      .filter((line) => !line.includes("# pulse-remind"))
      .join("\n");

    // Write new crontab
    const setCron = new Deno.Command("crontab", {
      args: ["-"],
      stdin: "piped",
      stdout: "null",
      stderr: "null",
    });
    const process = setCron.spawn();
    const writer = process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(crontab));
    await writer.close();
    await process.status;

    // Remove script file
    const scriptPath = getRemindScriptPath().replace(/\.sh$/, "-linux.sh");
    try {
      await Deno.remove(scriptPath);
    } catch { /* ignore */ }

    return true;
  } catch {
    return false;
  }
}

async function isCronInstalled(): Promise<boolean> {
  try {
    const getCron = new Deno.Command("crontab", {
      args: ["-l"],
      stdout: "piped",
      stderr: "null",
    });
    const { stdout } = await getCron.output();
    const crontab = new TextDecoder().decode(stdout);
    return crontab.includes("# pulse-remind");
  } catch {
    return false;
  }
}
