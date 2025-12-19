/**
 * Tests for storage utilities
 */

import { assertEquals, assertRejects } from "@std/assert";
import {
  appendToFile,
  dirExists,
  ensureDir,
  fileExists,
  listDirs,
  listFiles,
  readJson,
  updateJson,
  writeJson,
} from "../lib/storage.ts";
import { join } from "@std/path";

// Helper to create a temp directory for tests
async function createTempDir(): Promise<string> {
  return await Deno.makeTempDir({ prefix: "devex_test_" });
}

// Helper to clean up temp directory
async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await Deno.remove(dir, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
}

Deno.test("readJson - returns null for missing file", async () => {
  const result = await readJson<{ foo: string }>("/nonexistent/path/file.json");
  assertEquals(result, null);
});

Deno.test("readJson - parses valid JSON", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "test.json");
    await Deno.writeTextFile(path, '{"name": "test", "value": 42}');

    const result = await readJson<{ name: string; value: number }>(path);
    assertEquals(result, { name: "test", value: 42 });
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("readJson - throws on invalid JSON", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "invalid.json");
    await Deno.writeTextFile(path, "not valid json {");

    await assertRejects(
      () => readJson<unknown>(path),
      Error,
      "Failed to read",
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("writeJson - creates file with formatted JSON", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "output.json");
    const data = { name: "test", nested: { value: 123 } };

    await writeJson(path, data);

    const content = await Deno.readTextFile(path);
    assertEquals(content, JSON.stringify(data, null, 2));
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("writeJson - creates parent directories", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "nested", "deep", "file.json");
    const data = { test: true };

    await writeJson(path, data);

    const result = await readJson<{ test: boolean }>(path);
    assertEquals(result, { test: true });
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("writeJson - atomic write leaves no temp files on success", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "atomic.json");
    await writeJson(path, { data: "test" });

    const files = [];
    for await (const entry of Deno.readDir(tempDir)) {
      files.push(entry.name);
    }

    assertEquals(files.length, 1);
    assertEquals(files[0], "atomic.json");
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("appendToFile - creates new file", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "append.txt");
    await appendToFile(path, "first line\n");

    const content = await Deno.readTextFile(path);
    assertEquals(content, "first line\n");
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("appendToFile - appends to existing file", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "append.txt");
    await appendToFile(path, "line 1\n");
    await appendToFile(path, "line 2\n");
    await appendToFile(path, "line 3\n");

    const content = await Deno.readTextFile(path);
    assertEquals(content, "line 1\nline 2\nline 3\n");
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("appendToFile - creates parent directories", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "nested", "dir", "log.md");
    await appendToFile(path, "# Log\n");

    const content = await Deno.readTextFile(path);
    assertEquals(content, "# Log\n");
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("ensureDir - creates nested directories", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "a", "b", "c");
    await ensureDir(path);

    const stat = await Deno.stat(path);
    assertEquals(stat.isDirectory, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("ensureDir - no error if directory exists", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "existing");
    await Deno.mkdir(path);

    // Should not throw
    await ensureDir(path);

    const stat = await Deno.stat(path);
    assertEquals(stat.isDirectory, true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("fileExists - returns true for existing file", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "exists.txt");
    await Deno.writeTextFile(path, "content");

    assertEquals(await fileExists(path), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("fileExists - returns false for missing file", async () => {
  assertEquals(await fileExists("/nonexistent/file.txt"), false);
});

Deno.test("dirExists - returns true for existing directory", async () => {
  const tempDir = await createTempDir();
  try {
    assertEquals(await dirExists(tempDir), true);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("dirExists - returns false for missing directory", async () => {
  assertEquals(await dirExists("/nonexistent/dir"), false);
});

Deno.test("dirExists - returns false for file", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "file.txt");
    await Deno.writeTextFile(path, "content");

    assertEquals(await dirExists(path), false);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("listFiles - returns sorted file names", async () => {
  const tempDir = await createTempDir();
  try {
    await Deno.writeTextFile(join(tempDir, "c.json"), "{}");
    await Deno.writeTextFile(join(tempDir, "a.json"), "{}");
    await Deno.writeTextFile(join(tempDir, "b.json"), "{}");
    await Deno.mkdir(join(tempDir, "subdir"));

    const files = await listFiles(tempDir);
    assertEquals(files, ["a.json", "b.json", "c.json"]);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("listFiles - returns empty array for missing directory", async () => {
  const files = await listFiles("/nonexistent/directory");
  assertEquals(files, []);
});

Deno.test("listDirs - returns sorted directory names", async () => {
  const tempDir = await createTempDir();
  try {
    await Deno.mkdir(join(tempDir, "z-dir"));
    await Deno.mkdir(join(tempDir, "a-dir"));
    await Deno.mkdir(join(tempDir, "m-dir"));
    await Deno.writeTextFile(join(tempDir, "file.txt"), "");

    const dirs = await listDirs(tempDir);
    assertEquals(dirs, ["a-dir", "m-dir", "z-dir"]);
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("listDirs - returns empty array for missing directory", async () => {
  const dirs = await listDirs("/nonexistent/directory");
  assertEquals(dirs, []);
});

Deno.test("updateJson - creates file if missing", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "update.json");

    const result = await updateJson<{ count: number }>(
      path,
      (current) => current ?? { count: 0 },
    );

    assertEquals(result, { count: 0 });

    const saved = await readJson<{ count: number }>(path);
    assertEquals(saved, { count: 0 });
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("updateJson - updates existing file", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "update.json");
    await writeJson(path, { count: 5 });

    const result = await updateJson<{ count: number }>(
      path,
      (current) => ({ count: (current?.count ?? 0) + 1 }),
    );

    assertEquals(result, { count: 6 });

    const saved = await readJson<{ count: number }>(path);
    assertEquals(saved, { count: 6 });
  } finally {
    await cleanupTempDir(tempDir);
  }
});

// =============================================================================
// Date serialization tests
// =============================================================================

Deno.test("writeJson - serializes Date objects to ISO strings", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "dates.json");
    const date = new Date("2025-01-15T10:30:00.000Z");
    await writeJson(path, { createdAt: date });

    const content = await Deno.readTextFile(path);
    const parsed = JSON.parse(content);
    assertEquals(parsed.createdAt, "2025-01-15T10:30:00.000Z");
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("readJson - deserializes ISO strings to Date objects", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "dates.json");
    await Deno.writeTextFile(path, '{"createdAt": "2025-01-15T10:30:00.000Z"}');

    const result = await readJson<{ createdAt: Date }>(path);
    assertEquals(result?.createdAt instanceof Date, true);
    assertEquals(result?.createdAt.toISOString(), "2025-01-15T10:30:00.000Z");
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("readJson - handles nested Date objects", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "nested.json");
    const data = {
      name: "test",
      block: {
        startDate: new Date("2025-01-01T00:00:00.000Z"),
        endDate: new Date("2025-01-15T00:00:00.000Z"),
      },
      timestamps: [
        new Date("2025-01-02T00:00:00.000Z"),
        new Date("2025-01-03T00:00:00.000Z"),
      ],
    };

    await writeJson(path, data);
    const result = await readJson<typeof data>(path);

    assertEquals(result?.block.startDate instanceof Date, true);
    assertEquals(result?.block.endDate instanceof Date, true);
    assertEquals(result?.timestamps[0] instanceof Date, true);
    assertEquals(result?.timestamps[1] instanceof Date, true);
    assertEquals(
      result?.block.startDate.toISOString(),
      "2025-01-01T00:00:00.000Z",
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("readJson - does not convert non-ISO date strings", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "strings.json");
    await Deno.writeTextFile(
      path,
      '{"date": "2025-01-15", "name": "not-a-date"}',
    );

    const result = await readJson<{ date: string; name: string }>(path);
    assertEquals(typeof result?.date, "string");
    assertEquals(result?.date, "2025-01-15");
    assertEquals(result?.name, "not-a-date");
  } finally {
    await cleanupTempDir(tempDir);
  }
});

Deno.test("round-trip preserves Date values", async () => {
  const tempDir = await createTempDir();
  try {
    const path = join(tempDir, "roundtrip.json");
    const original = {
      createdAt: new Date("2025-06-15T14:30:00.000Z"),
      items: [
        { timestamp: new Date("2025-06-15T10:00:00.000Z") },
        { timestamp: new Date("2025-06-15T12:00:00.000Z") },
      ],
    };

    await writeJson(path, original);
    const loaded = await readJson<typeof original>(path);

    assertEquals(loaded?.createdAt.getTime(), original.createdAt.getTime());
    assertEquals(
      loaded?.items[0].timestamp.getTime(),
      original.items[0].timestamp.getTime(),
    );
    assertEquals(
      loaded?.items[1].timestamp.getTime(),
      original.items[1].timestamp.getTime(),
    );
  } finally {
    await cleanupTempDir(tempDir);
  }
});
