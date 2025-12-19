/**
 * Tests for analysis utilities
 * Focus: pure aggregation functions for checkins and daily logs
 */

import { assertEquals } from "@std/assert";
import { aggregateCheckins, aggregateDailyLogs } from "../lib/analysis.ts";
import { makeCheckin, makeDailyLog } from "./helpers.ts";

// =============================================================================
// aggregateCheckins - empty and basic cases
// =============================================================================

Deno.test("aggregateCheckins - empty array returns null averages", () => {
  const stats = aggregateCheckins([]);
  assertEquals(stats.count, 0);
  assertEquals(stats.promptedCount, 0);
  assertEquals(stats.avgEnergy, null);
  assertEquals(stats.avgFocus, null);
  assertEquals(stats.stuckPercent, 0);
  assertEquals(stats.avgStuckMinutes, null);
  assertEquals(stats.topWords, []);
});

Deno.test("aggregateCheckins - counts total checkins", () => {
  const checkins = [
    makeCheckin(),
    makeCheckin(),
    makeCheckin(),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.count, 3);
});

Deno.test("aggregateCheckins - counts prompted checkins", () => {
  const checkins = [
    makeCheckin({ prompted: true }),
    makeCheckin({ prompted: false }),
    makeCheckin({ prompted: true }),
    makeCheckin({ prompted: false }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.promptedCount, 2);
});

// =============================================================================
// aggregateCheckins - energy and focus averages
// =============================================================================

Deno.test("aggregateCheckins - averages energy correctly", () => {
  const checkins = [
    makeCheckin({ energy: 3 }),
    makeCheckin({ energy: 5 }),
    makeCheckin({ energy: 4 }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.avgEnergy, 4.0);
});

Deno.test("aggregateCheckins - averages energy with missing values", () => {
  const checkins = [
    makeCheckin({ energy: 4 }),
    makeCheckin({}), // no energy
    makeCheckin({ energy: 2 }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.avgEnergy, 3.0); // (4+2)/2
});

Deno.test("aggregateCheckins - averages focus correctly", () => {
  const checkins = [
    makeCheckin({ focus: 5 }),
    makeCheckin({ focus: 3 }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.avgFocus, 4.0);
});

Deno.test("aggregateCheckins - rounds averages to 1 decimal", () => {
  const checkins = [
    makeCheckin({ energy: 3 }),
    makeCheckin({ energy: 4 }),
    makeCheckin({ energy: 4 }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.avgEnergy, 3.7); // 11/3 = 3.666... rounded to 3.7
});

// =============================================================================
// aggregateCheckins - stuck tracking
// =============================================================================

Deno.test("aggregateCheckins - calculates stuck percentage", () => {
  const checkins = [
    makeCheckin({ stuck: true }),
    makeCheckin({ stuck: false }),
    makeCheckin({ stuck: true }),
    makeCheckin({ stuck: false }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.stuckPercent, 50);
});

Deno.test("aggregateCheckins - stuck percentage rounds to integer", () => {
  const checkins = [
    makeCheckin({ stuck: true }),
    makeCheckin({ stuck: false }),
    makeCheckin({ stuck: false }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.stuckPercent, 33); // 33.33% rounded
});

Deno.test("aggregateCheckins - averages stuck minutes when stuck", () => {
  const checkins = [
    makeCheckin({ stuck: true, stuckMinutes: 30 }),
    makeCheckin({ stuck: true, stuckMinutes: 60 }),
    makeCheckin({ stuck: false }), // ignored
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.avgStuckMinutes, 45);
});

Deno.test("aggregateCheckins - null avgStuckMinutes when no one stuck", () => {
  const checkins = [
    makeCheckin({ stuck: false }),
    makeCheckin({ stuck: false }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.avgStuckMinutes, null);
});

// =============================================================================
// aggregateCheckins - top words
// =============================================================================

Deno.test("aggregateCheckins - extracts top words", () => {
  const checkins = [
    makeCheckin({ oneWord: "focused" }),
    makeCheckin({ oneWord: "tired" }),
    makeCheckin({ oneWord: "focused" }),
    makeCheckin({ oneWord: "focused" }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.topWords[0], { word: "focused", count: 3 });
  assertEquals(stats.topWords[1], { word: "tired", count: 1 });
});

Deno.test("aggregateCheckins - top words case insensitive", () => {
  const checkins = [
    makeCheckin({ oneWord: "Focused" }),
    makeCheckin({ oneWord: "FOCUSED" }),
    makeCheckin({ oneWord: "focused" }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.topWords.length, 1);
  assertEquals(stats.topWords[0], { word: "focused", count: 3 });
});

Deno.test("aggregateCheckins - top words trims whitespace", () => {
  const checkins = [
    makeCheckin({ oneWord: "  focused  " }),
    makeCheckin({ oneWord: "focused" }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.topWords[0], { word: "focused", count: 2 });
});

Deno.test("aggregateCheckins - top words limits to 5", () => {
  const checkins = [
    makeCheckin({ oneWord: "a" }),
    makeCheckin({ oneWord: "b" }),
    makeCheckin({ oneWord: "c" }),
    makeCheckin({ oneWord: "d" }),
    makeCheckin({ oneWord: "e" }),
    makeCheckin({ oneWord: "f" }),
    makeCheckin({ oneWord: "g" }),
  ];
  const stats = aggregateCheckins(checkins);
  assertEquals(stats.topWords.length, 5);
});

// =============================================================================
// aggregateDailyLogs - empty and basic cases
// =============================================================================

Deno.test("aggregateDailyLogs - empty returns null averages", () => {
  const stats = aggregateDailyLogs([]);
  assertEquals(stats.count, 0);
  assertEquals(stats.avgRatings.confidence, null);
  assertEquals(stats.avgRatings.understanding, null);
  assertEquals(stats.avgRatings.fulfillment, null);
  assertEquals(stats.avgRatings.enjoyment, null);
  assertEquals(stats.avgRatings.cognitiveLoad, null);
  assertEquals(stats.taskTypeDistribution, {
    routine: 0,
    integrative: 0,
    creative: 0,
  });
});

Deno.test("aggregateDailyLogs - counts logs", () => {
  const logs = [makeDailyLog(), makeDailyLog(), makeDailyLog()];
  const stats = aggregateDailyLogs(logs);
  assertEquals(stats.count, 3);
});

// =============================================================================
// aggregateDailyLogs - ratings
// =============================================================================

Deno.test("aggregateDailyLogs - averages ratings correctly", () => {
  const logs = [
    makeDailyLog({ ratings: { confidence: 4, fulfillment: 3 } }),
    makeDailyLog({ ratings: { confidence: 2, fulfillment: 5 } }),
  ];
  const stats = aggregateDailyLogs(logs);
  assertEquals(stats.avgRatings.confidence, 3.0);
  assertEquals(stats.avgRatings.fulfillment, 4.0);
});

Deno.test("aggregateDailyLogs - handles missing ratings gracefully", () => {
  const logs = [
    makeDailyLog({ ratings: { confidence: 4 } }),
    makeDailyLog({ ratings: { understanding: 3 } }),
    makeDailyLog({}), // no ratings at all
  ];
  const stats = aggregateDailyLogs(logs);
  assertEquals(stats.avgRatings.confidence, 4.0);
  assertEquals(stats.avgRatings.understanding, 3.0);
  assertEquals(stats.avgRatings.fulfillment, null);
});

Deno.test("aggregateDailyLogs - rounds ratings to 1 decimal", () => {
  const logs = [
    makeDailyLog({ ratings: { confidence: 3 } }),
    makeDailyLog({ ratings: { confidence: 4 } }),
    makeDailyLog({ ratings: { confidence: 4 } }),
  ];
  const stats = aggregateDailyLogs(logs);
  assertEquals(stats.avgRatings.confidence, 3.7); // 11/3 = 3.666...
});

// =============================================================================
// aggregateDailyLogs - task type distribution
// =============================================================================

Deno.test("aggregateDailyLogs - calculates task type distribution", () => {
  const logs = [
    makeDailyLog({ taskTypes: ["routine", "routine", "creative"] }),
    makeDailyLog({ taskTypes: ["integrative"] }),
  ];
  const stats = aggregateDailyLogs(logs);
  // 2 routine, 1 creative, 1 integrative = 4 total
  assertEquals(stats.taskTypeDistribution.routine, 50); // 2/4
  assertEquals(stats.taskTypeDistribution.creative, 25); // 1/4
  assertEquals(stats.taskTypeDistribution.integrative, 25); // 1/4
});

Deno.test("aggregateDailyLogs - handles missing taskTypes", () => {
  const logs = [
    makeDailyLog({ taskTypes: ["routine"] }),
    makeDailyLog({}), // no taskTypes
  ];
  const stats = aggregateDailyLogs(logs);
  assertEquals(stats.taskTypeDistribution.routine, 100);
  assertEquals(stats.taskTypeDistribution.creative, 0);
  assertEquals(stats.taskTypeDistribution.integrative, 0);
});

Deno.test("aggregateDailyLogs - all zeros when no taskTypes", () => {
  const logs = [
    makeDailyLog({}),
    makeDailyLog({}),
  ];
  const stats = aggregateDailyLogs(logs);
  assertEquals(stats.taskTypeDistribution, {
    routine: 0,
    integrative: 0,
    creative: 0,
  });
});
