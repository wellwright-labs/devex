/**
 * Tests for metrics utilities
 * Focus: pure functions for repo parsing and aggregation
 * Integration tests for git metrics with author filtering
 */

import { assertEquals, assertGreater } from "@std/assert";
import {
  aggregateRepoMetrics,
  computeLocalRepoMetrics,
  parseRepoIdentifier,
} from "../lib/metrics.ts";
import { cleanupTempDir, createTempDir, makeRepoMetrics } from "./helpers.ts";

// =============================================================================
// parseRepoIdentifier - Local paths
// =============================================================================

Deno.test("parseRepoIdentifier - absolute path with /", () => {
  const result = parseRepoIdentifier("/path/to/repo");
  assertEquals(result, { type: "local", path: "/path/to/repo" });
});

Deno.test("parseRepoIdentifier - home path with ~", () => {
  const home = Deno.env.get("HOME") || "";
  const result = parseRepoIdentifier("~/code/project");
  assertEquals(result, { type: "local", path: `${home}/code/project` });
});

Deno.test("parseRepoIdentifier - relative path with ./", () => {
  const result = parseRepoIdentifier("./relative/path");
  assertEquals(result, { type: "local", path: "./relative/path" });
});

Deno.test("parseRepoIdentifier - relative path with ../", () => {
  const result = parseRepoIdentifier("../parent/path");
  assertEquals(result, { type: "local", path: "../parent/path" });
});

// =============================================================================
// parseRepoIdentifier - GitHub URLs
// =============================================================================

Deno.test("parseRepoIdentifier - github https URL", () => {
  const result = parseRepoIdentifier("https://github.com/owner/repo");
  assertEquals(result, { type: "github", owner: "owner", repo: "repo" });
});

Deno.test("parseRepoIdentifier - github http URL", () => {
  const result = parseRepoIdentifier("http://github.com/owner/repo");
  assertEquals(result, { type: "github", owner: "owner", repo: "repo" });
});

Deno.test("parseRepoIdentifier - github URL with .git suffix", () => {
  const result = parseRepoIdentifier("https://github.com/owner/repo.git");
  assertEquals(result, { type: "github", owner: "owner", repo: "repo" });
});

Deno.test("parseRepoIdentifier - github URL with www", () => {
  const result = parseRepoIdentifier("https://www.github.com/owner/repo");
  assertEquals(result, { type: "github", owner: "owner", repo: "repo" });
});

Deno.test("parseRepoIdentifier - github URL without protocol", () => {
  const result = parseRepoIdentifier("github.com/owner/repo");
  assertEquals(result, { type: "github", owner: "owner", repo: "repo" });
});

// =============================================================================
// parseRepoIdentifier - GitHub short form
// =============================================================================

Deno.test("parseRepoIdentifier - github short form owner/repo", () => {
  const result = parseRepoIdentifier("facebook/react");
  assertEquals(result, { type: "github", owner: "facebook", repo: "react" });
});

Deno.test("parseRepoIdentifier - github short form with dashes", () => {
  const result = parseRepoIdentifier("my-org/my-repo-name");
  assertEquals(result, {
    type: "github",
    owner: "my-org",
    repo: "my-repo-name",
  });
});

Deno.test("parseRepoIdentifier - github short form with underscores", () => {
  const result = parseRepoIdentifier("org_name/repo_name");
  assertEquals(result, {
    type: "github",
    owner: "org_name",
    repo: "repo_name",
  });
});

// =============================================================================
// parseRepoIdentifier - Edge cases
// =============================================================================

Deno.test("parseRepoIdentifier - plain name defaults to local", () => {
  // A plain name without / should be treated as local path
  const result = parseRepoIdentifier("myrepo");
  assertEquals(result, { type: "local", path: "myrepo" });
});

// =============================================================================
// aggregateRepoMetrics - basic aggregation
// =============================================================================

Deno.test("aggregateRepoMetrics - empty object returns zeros", () => {
  const result = aggregateRepoMetrics({});
  assertEquals(result.commits, 0);
  assertEquals(result.linesAdded, 0);
  assertEquals(result.linesRemoved, 0);
  assertEquals(result.filesChanged, 0);
  assertEquals(result.avgCommitsPerDay, 0);
  assertEquals(result.firstCommitTimes, []);
});

Deno.test("aggregateRepoMetrics - single repo unchanged", () => {
  const metrics = makeRepoMetrics({
    commits: 10,
    linesAdded: 100,
    linesRemoved: 50,
  });
  const result = aggregateRepoMetrics({ repo1: metrics });
  assertEquals(result.commits, 10);
  assertEquals(result.linesAdded, 100);
  assertEquals(result.linesRemoved, 50);
});

Deno.test("aggregateRepoMetrics - sums numeric fields", () => {
  const repo1 = makeRepoMetrics({
    commits: 10,
    linesAdded: 100,
    linesRemoved: 50,
    filesChanged: 5,
    testFilesChanged: 2,
    docFilesChanged: 1,
  });
  const repo2 = makeRepoMetrics({
    commits: 5,
    linesAdded: 200,
    linesRemoved: 25,
    filesChanged: 10,
    testFilesChanged: 3,
    docFilesChanged: 2,
  });

  const result = aggregateRepoMetrics({ repo1, repo2 });
  assertEquals(result.commits, 15);
  assertEquals(result.linesAdded, 300);
  assertEquals(result.linesRemoved, 75);
  assertEquals(result.filesChanged, 15);
  assertEquals(result.testFilesChanged, 5);
  assertEquals(result.docFilesChanged, 3);
});

Deno.test("aggregateRepoMetrics - averages avgCommitsPerDay", () => {
  const repo1 = makeRepoMetrics({ avgCommitsPerDay: 2.0 });
  const repo2 = makeRepoMetrics({ avgCommitsPerDay: 4.0 });
  const repo3 = makeRepoMetrics({ avgCommitsPerDay: 3.0 });

  const result = aggregateRepoMetrics({ repo1, repo2, repo3 });
  assertEquals(result.avgCommitsPerDay, 3.0); // (2+4+3)/3
});

Deno.test("aggregateRepoMetrics - merges firstCommitTimes", () => {
  const date1 = new Date("2025-01-15T09:00:00");
  const date2 = new Date("2025-01-16T10:00:00");
  const date3 = new Date("2025-01-15T11:00:00"); // Same day as date1, later time

  const repo1 = makeRepoMetrics({ firstCommitTimes: [date1, date2] });
  const repo2 = makeRepoMetrics({ firstCommitTimes: [date3] });

  const result = aggregateRepoMetrics({ repo1, repo2 });

  // Should have 2 dates (one per day), with earliest time per day
  assertEquals(result.firstCommitTimes.length, 2);
  // First commit on 2025-01-15 should be 09:00 (earlier than 11:00)
  assertEquals(result.firstCommitTimes[0].toISOString(), date1.toISOString());
  assertEquals(result.firstCommitTimes[1].toISOString(), date2.toISOString());
});

Deno.test("aggregateRepoMetrics - sorts firstCommitTimes by date", () => {
  const date1 = new Date("2025-01-17T09:00:00");
  const date2 = new Date("2025-01-15T09:00:00");
  const date3 = new Date("2025-01-16T09:00:00");

  const repo1 = makeRepoMetrics({ firstCommitTimes: [date1, date2, date3] });

  const result = aggregateRepoMetrics({ repo1 });

  // Should be sorted chronologically
  assertEquals(result.firstCommitTimes[0].toISOString(), date2.toISOString()); // 15th
  assertEquals(result.firstCommitTimes[1].toISOString(), date3.toISOString()); // 16th
  assertEquals(result.firstCommitTimes[2].toISOString(), date1.toISOString()); // 17th
});

// =============================================================================
// computeLocalRepoMetrics - Integration tests with real git repos
// =============================================================================

/**
 * Helper to run git commands in a directory
 */
async function runGit(
  args: string[],
  cwd: string,
): Promise<{ success: boolean; stdout: string }> {
  const command = new Deno.Command("git", {
    args,
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  const { success, stdout } = await command.output();
  return { success, stdout: new TextDecoder().decode(stdout) };
}

/**
 * Create a test git repo with commits from different authors
 */
async function createTestGitRepo(
  dir: string,
  userEmail: string,
  userName: string,
): Promise<void> {
  await runGit(["init"], dir);
  await runGit(["config", "user.email", userEmail], dir);
  await runGit(["config", "user.name", userName], dir);
}

Deno.test("computeLocalRepoMetrics - filters by author email", async () => {
  const tempDir = await createTempDir();

  try {
    // Set up git repo with current user's email
    await createTestGitRepo(tempDir, "test@example.com", "Test User");

    // Create a file and commit as current user
    await Deno.writeTextFile(`${tempDir}/file1.txt`, "content from user");
    await runGit(["add", "file1.txt"], tempDir);
    await runGit(["commit", "-m", "User commit"], tempDir);

    // Create another commit as a different author
    await runGit(["config", "user.email", "other@example.com"], tempDir);
    await runGit(["config", "user.name", "Other User"], tempDir);
    await Deno.writeTextFile(`${tempDir}/file2.txt`, "content from other");
    await runGit(["add", "file2.txt"], tempDir);
    await runGit(["commit", "-m", "Other commit"], tempDir);

    // Reset back to original user for the test
    await runGit(["config", "user.email", "test@example.com"], tempDir);
    await runGit(["config", "user.name", "Test User"], tempDir);

    // Compute metrics - should only count commits by test@example.com
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

    const metrics = await computeLocalRepoMetrics(tempDir, startDate, endDate);

    // Should only count 1 commit (from the current user)
    assertEquals(metrics.commits, 1);
    // Should only count file1.txt changes
    assertEquals(metrics.filesChanged, 1);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("computeLocalRepoMetrics - counts all commits from current user", async () => {
  const tempDir = await createTempDir();

  try {
    await createTestGitRepo(tempDir, "test@example.com", "Test User");

    // Create multiple commits as current user
    await Deno.writeTextFile(`${tempDir}/file1.txt`, "content 1");
    await runGit(["add", "file1.txt"], tempDir);
    await runGit(["commit", "-m", "Commit 1"], tempDir);

    await Deno.writeTextFile(`${tempDir}/file2.txt`, "content 2");
    await runGit(["add", "file2.txt"], tempDir);
    await runGit(["commit", "-m", "Commit 2"], tempDir);

    await Deno.writeTextFile(`${tempDir}/file3.txt`, "content 3");
    await runGit(["add", "file3.txt"], tempDir);
    await runGit(["commit", "-m", "Commit 3"], tempDir);

    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const metrics = await computeLocalRepoMetrics(tempDir, startDate, endDate);

    assertEquals(metrics.commits, 3);
    assertEquals(metrics.filesChanged, 3);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("computeLocalRepoMetrics - calculates lines correctly with author filter", async () => {
  const tempDir = await createTempDir();

  try {
    await createTestGitRepo(tempDir, "test@example.com", "Test User");

    // Create file with multiple lines
    await Deno.writeTextFile(`${tempDir}/code.ts`, "line1\nline2\nline3\n");
    await runGit(["add", "code.ts"], tempDir);
    await runGit(["commit", "-m", "Add code file"], tempDir);

    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const metrics = await computeLocalRepoMetrics(tempDir, startDate, endDate);

    assertEquals(metrics.commits, 1);
    assertGreater(metrics.linesAdded, 0);
    assertEquals(metrics.linesRemoved, 0);
  } finally {
    await cleanupTempDir(tempDir);
  }
});
