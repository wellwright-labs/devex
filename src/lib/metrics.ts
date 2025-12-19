/**
 * Git metrics computation for Devex
 * Supports both local git repos (via CLI) and GitHub repos (via API)
 */

import type { Block, GitMetrics, RepoMetrics } from "../types/mod.ts";
  Block,
  GitMetrics,
  RepoMetrics,
  Repository,
} from "../types/mod.ts";
import { getGitHubToken } from "./config.ts";
import { gitCommand } from "./git.ts";

// =============================================================================
// Repository Identifier Parsing
// =============================================================================

export interface LocalRepo {
  type: "local";
  path: string;
}

export interface GitHubRepo {
  type: "github";
  owner: string;
  repo: string;
}

export type RepoIdentifier = LocalRepo | GitHubRepo;

/**
 * Parse a repository string into a typed identifier
 * Local: /path/to/repo, ~/repo, ./repo
 * GitHub: owner/repo, https://github.com/owner/repo, github.com/owner/repo
 */
export function parseRepoIdentifier(repo: string): RepoIdentifier {
  // Local paths start with /, ~, or .
  if (repo.startsWith("/") || repo.startsWith("~") || repo.startsWith(".")) {
    // Expand ~ to home directory
    const path = repo.startsWith("~")
      ? repo.replace("~", Deno.env.get("HOME") || "")
      : repo;
    return { type: "local", path };
  }

  // GitHub URL patterns
  const githubUrlMatch = repo.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?$/,
  );
  if (githubUrlMatch) {
    return {
      type: "github",
      owner: githubUrlMatch[1],
      repo: githubUrlMatch[2],
    };
  }

  // Short form: owner/repo
  const shortMatch = repo.match(/^([^\/]+)\/([^\/]+)$/);
  if (shortMatch) {
    return { type: "github", owner: shortMatch[1], repo: shortMatch[2] };
  }

  // Default to local path (maybe relative)
  return { type: "local", path: repo };
}

      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.login;
    }
  } catch {
    // Ignore errors, will fall back to no filtering
  }

  return null;
}

// =============================================================================
// Local Git Metrics
// =============================================================================

/**
 * Compute metrics for a local git repository
 * Filters to commits by the current git user
 */
export async function computeLocalRepoMetrics(
  repoPath: string,
  startDate: Date,
  endDate: Date,
  branch?: string,
): Promise<RepoMetrics> {
  // Verify it's a git repository
  const checkResult = await gitCommand(
    ["rev-parse", "--is-inside-work-tree"],
    repoPath,
  );

  if (!checkResult.success) {
    throw new Error(
      `Not a git repository or path doesn't exist: ${repoPath}`,
    );
  }

  // Get current user's email for filtering
  const userEmail = await getGitUserEmail(repoPath);

  const afterDate = startDate.toISOString();
  const beforeDate = endDate.toISOString();

  // Build git log arguments
  const logArgs = [
    "log",
  ];

  // Add branch if specified (must come before date filters)
  if (branch) {
    logArgs.push(branch);
  }

  logArgs.push(
    `--after=${afterDate}`,
    `--before=${beforeDate}`,
    "--format=%H|%aI",
  );

  // Filter by author if we have the user's email
  if (userEmail) {
    logArgs.push(`--author=${userEmail}`);
  }

  // Get commit hashes and timestamps
  const logResult = await gitCommand(logArgs, repoPath);

  const commits: Array<{ hash: string; date: Date }> = [];
  if (logResult.success && logResult.stdout) {
    for (const line of logResult.stdout.split("\n")) {
      if (line.trim()) {
        const [hash, dateStr] = line.split("|");
        commits.push({ hash, date: new Date(dateStr) });
      }
    }
  }

  // Build numstat arguments (same author filter)
  const numstatArgs = [
    "log",
  ];

  // Add branch if specified (must come before date filters)
  if (branch) {
    numstatArgs.push(branch);
  }

  numstatArgs.push(
    `--after=${afterDate}`,
    `--before=${beforeDate}`,
    "--numstat",
    "--format=",
  );

  if (userEmail) {
    numstatArgs.push(`--author=${userEmail}`);
  }

  // Get numstat for line counts
  const numstatResult = await gitCommand(numstatArgs, repoPath);

  let linesAdded = 0;
  let linesRemoved = 0;
  const filesChanged = new Set<string>();
  const testFiles = new Set<string>();
  const docFiles = new Set<string>();

  if (numstatResult.success && numstatResult.stdout) {
    for (const line of numstatResult.stdout.split("\n")) {
      const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (match) {
        const added = match[1] === "-" ? 0 : parseInt(match[1], 10);
        const removed = match[2] === "-" ? 0 : parseInt(match[2], 10);
        const file = match[3];

        linesAdded += added;
        linesRemoved += removed;
        filesChanged.add(file);

        // Categorize files
        if (isTestFile(file)) {
          testFiles.add(file);
        }
        if (isDocFile(file)) {
          docFiles.add(file);
        }
      }
    }
  }

  // Calculate days in range
  const days = Math.max(
    1,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  // Get first commit time each day for procrastination analysis
  const firstCommitTimes = getFirstCommitPerDay(commits);

  return {
    commits: commits.length,
    linesAdded,
    linesRemoved,
    filesChanged: filesChanged.size,
    testFilesChanged: testFiles.size,
    docFilesChanged: docFiles.size,
    avgCommitsPerDay: commits.length / days,
    firstCommitTimes,
  };
}

// =============================================================================
// GitHub API Metrics
// =============================================================================

/**
 * Compute metrics for a GitHub repository via API
 * Filters to commits by the authenticated user
 */
export async function computeGitHubRepoMetrics(
  owner: string,
  repo: string,
  startDate: Date,
  endDate: Date,
  branch?: string,
): Promise<RepoMetrics> {
  const token = await getGitHubToken();

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "devex-cli",
  };

  if (token) {
    headers["Authorization"] = `token ${token}`;
  }

  // Get current user's GitHub username for filtering
  const username = await getGitHubUsername();

  // Fetch all commits in date range with pagination
  const since = startDate.toISOString();
  const until = endDate.toISOString();
  const commits: Array<{ sha: string; date: Date }> = [];

  let page = 1;
  const perPage = 100;

  while (true) {
    // Build URL with optional author and branch filters
    let commitsUrl =
      `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&until=${until}&per_page=${perPage}&page=${page}`;

    if (branch) {
      commitsUrl += `&sha=${branch}`;
    }

    if (username) {
      commitsUrl += `&author=${username}`;
    }

    const commitsResponse = await fetch(commitsUrl, { headers });

    if (!commitsResponse.ok) {
      if (commitsResponse.status === 401 || commitsResponse.status === 403) {
        throw new Error(
          `GitHub API auth failed for ${owner}/${repo}. Set GITHUB_TOKEN env var.`,
        );
      }
      if (commitsResponse.status === 404) {
        throw new Error(
          `Repository ${owner}/${repo} not found or is private. Check the name or set GITHUB_TOKEN.`,
        );
      }
      throw new Error(
        `GitHub API error: ${commitsResponse.status} ${commitsResponse.statusText}`,
      );
    }

    const commitsData = await commitsResponse.json();

    if (commitsData.length === 0) {
      break;
    }

    for (const commit of commitsData) {
      commits.push({
        sha: commit.sha,
        date: new Date(commit.commit.author.date),
      });
    }

    // If we got fewer than perPage, we've reached the end
    if (commitsData.length < perPage) {
      break;
    }

    page++;

    // Safety limit to avoid infinite loops
    if (page > 50) {
      console.warn(
        `Warning: Stopped at 5000 commits for ${owner}/${repo}. Some commits may be excluded.`,
      );
      break;
    }
  }

  // Get stats for each commit (rate limited, so sample if many commits)
  let linesAdded = 0;
  let linesRemoved = 0;
  const filesChanged = new Set<string>();
  const testFiles = new Set<string>();
  const docFiles = new Set<string>();

  // Limit API calls - sample commits if there are many
  const commitsToFetch = commits.length > 20
    ? commits.filter((_, i) => i % Math.ceil(commits.length / 20) === 0)
    : commits;

  for (const commit of commitsToFetch) {
    const commitUrl =
      `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`;
    const commitResponse = await fetch(commitUrl, { headers });

    if (commitResponse.ok) {
      const commitData = await commitResponse.json();

      if (commitData.stats) {
        linesAdded += commitData.stats.additions || 0;
        linesRemoved += commitData.stats.deletions || 0;
      }

      if (commitData.files) {
        for (const file of commitData.files) {
          filesChanged.add(file.filename);
          if (isTestFile(file.filename)) {
            testFiles.add(file.filename);
          }
          if (isDocFile(file.filename)) {
            docFiles.add(file.filename);
          }
        }
      }
    }
  }

  // Scale up if we sampled
  if (commitsToFetch.length < commits.length) {
    const scale = commits.length / commitsToFetch.length;
    linesAdded = Math.round(linesAdded * scale);
    linesRemoved = Math.round(linesRemoved * scale);
  }

  const days = Math.max(
    1,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  const firstCommitTimes = getFirstCommitPerDay(
    commits.map((c) => ({ hash: c.sha, date: c.date })),
  );

  return {
    commits: commits.length,
    linesAdded,
    linesRemoved,
    filesChanged: filesChanged.size,
    testFilesChanged: testFiles.size,
    docFilesChanged: docFiles.size,
    avgCommitsPerDay: commits.length / days,
    firstCommitTimes,
  };
}

// =============================================================================
// Aggregation
// =============================================================================

/**
 * Compute metrics for a single repository (local or GitHub)
 */
export function computeRepoMetrics(
  repo: Repository,
  startDate: Date,
  endDate: Date,
): Promise<RepoMetrics> {
  const identifier = parseRepoIdentifier(repo.path);

  if (identifier.type === "local") {
    return computeLocalRepoMetrics(
      identifier.path,
      startDate,
      endDate,
      repo.branch,
    );
  } else {
    return computeGitHubRepoMetrics(
      identifier.owner,
      identifier.repo,
      startDate,
      endDate,
      repo.branch,
    );
  }
}

/**
 * Aggregate metrics from multiple repositories
 */
export function aggregateRepoMetrics(
  repos: Record<string, RepoMetrics>,
): RepoMetrics {
  const allFirstCommitTimes: Date[] = [];

  const totals: RepoMetrics = {
    commits: 0,
    linesAdded: 0,
    linesRemoved: 0,
    filesChanged: 0,
    testFilesChanged: 0,
    docFilesChanged: 0,
    avgCommitsPerDay: 0,
    firstCommitTimes: [],
  };

  for (const metrics of Object.values(repos)) {
    totals.commits += metrics.commits;
    totals.linesAdded += metrics.linesAdded;
    totals.linesRemoved += metrics.linesRemoved;
    totals.filesChanged += metrics.filesChanged;
    totals.testFilesChanged += metrics.testFilesChanged;
    totals.docFilesChanged += metrics.docFilesChanged;
    allFirstCommitTimes.push(...metrics.firstCommitTimes);
  }

  // Average commits per day across all repos
  const repoCount = Object.keys(repos).length;
  if (repoCount > 0) {
    totals.avgCommitsPerDay = Object.values(repos).reduce((sum, m) =>
      sum + m.avgCommitsPerDay, 0) /
      repoCount;
  }

  // Merge first commit times and re-compute per day
  totals.firstCommitTimes = getFirstCommitPerDay(
    allFirstCommitTimes.map((d) => ({ hash: "", date: d })),
  );

  return totals;
}

/**
 * Compute git metrics for a block across all configured repositories
 */
export async function computeGitMetrics(
  block: Block,
  repositories: Repository[],
): Promise<GitMetrics> {
  const startDate = block.startDate;
  const endDate = block.endDate ?? new Date();

  const repoMetrics: Record<string, RepoMetrics> = {};

  for (const repo of repositories) {
    try {
      repoMetrics[repo.path] = await computeRepoMetrics(
        repo,
        startDate,
        endDate,
      );
    } catch (error) {
      // Log error but continue with other repos
      console.error(
        `Warning: Could not compute metrics for ${repo.path}:`,
        error,
      );
    }
  }

  return {
    block: block.id,
    computedAt: new Date(),
    dateRange: {
      start: startDate,
      end: endDate,
    },
    repositories: repoMetrics,
    totals: aggregateRepoMetrics(repoMetrics),
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if a file path is a test file
 */
function isTestFile(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.includes(".test.") ||
    lower.includes(".spec.") ||
    lower.includes("__test__") ||
    lower.includes("__tests__") ||
    lower.includes("/test/") ||
    lower.includes("/tests/")
  );
}

/**
 * Check if a file path is a documentation file
 */
function isDocFile(path: string): boolean {
  const lower = path.toLowerCase();
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".rst") ||
    lower.endsWith(".txt") ||
    lower.startsWith("readme") ||
    lower.includes("/docs/") ||
    lower.includes("/doc/")
  );
}

/**
 * Get the first commit time for each unique day
 */
function getFirstCommitPerDay(
  commits: Array<{ hash: string; date: Date }>,
): Date[] {
  const byDay = new Map<string, Date>();

  for (const commit of commits) {
    const dayKey = commit.date.toISOString().split("T")[0];
    const existing = byDay.get(dayKey);

    if (!existing || commit.date < existing) {
      byDay.set(dayKey, commit.date);
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.getTime() - b.getTime());
}
