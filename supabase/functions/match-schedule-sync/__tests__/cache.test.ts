// Unit tests for dynamic caching strategy
import { assertEquals, assertArrayIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { CacheManager, type CacheTTLConfig, type CacheInvalidationTrigger } from "../cache.ts";
import type { FIVBMatch } from "../sync.ts";

const mockMatches = {
  liveMatch: {
    No: "1",
    NoInTournament: "M001",
    TeamAName: "Team A",
    TeamBName: "Team B",
    LocalDate: new Date().toISOString().split('T')[0], // Today
    LocalTime: "14:30",
    Court: "Court 1",
    Status: "Running",
    Round: "Final"
  } as FIVBMatch,
  
  scheduledMatch: {
    No: "2",
    NoInTournament: "M002",
    TeamAName: "Team C",
    TeamBName: "Team D",
    LocalDate: new Date().toISOString().split('T')[0], // Today
    LocalTime: "16:00",
    Court: "Court 2",
    Status: "Scheduled",
    Round: "Semi-Final"
  } as FIVBMatch,
  
  finishedMatch: {
    No: "3",
    NoInTournament: "M003",
    TeamAName: "Team E",
    TeamBName: "Team F",
    LocalDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
    LocalTime: "10:00",
    Court: "Court 1",
    Status: "Finished",
    Round: "Quarter-Final"
  } as FIVBMatch,
  
  recentFinishedMatch: {
    No: "4",
    NoInTournament: "M004",
    TeamAName: "Team G",
    TeamBName: "Team H",
    LocalDate: new Date().toISOString().split('T')[0], // Today
    LocalTime: "12:00",
    Court: "Court 3",
    Status: "Finished",
    Round: "Group Stage"
  } as FIVBMatch
};

Deno.test("CacheManager - calculateMatchesTTL with live matches", () => {
  const cacheManager = new CacheManager();
  
  const matches = [mockMatches.liveMatch, mockMatches.scheduledMatch];
  const ttl = cacheManager.calculateMatchesTTL(matches);
  
  assertEquals(ttl, "30 seconds"); // Should prioritize live matches
});

Deno.test("CacheManager - calculateMatchesTTL with scheduled matches", () => {
  const cacheManager = new CacheManager();
  
  const matches = [mockMatches.scheduledMatch];
  const ttl = cacheManager.calculateMatchesTTL(matches);
  
  assertEquals(ttl, "15 minutes"); // Should use scheduled match TTL
});

Deno.test("CacheManager - calculateMatchesTTL with finished matches", () => {
  const cacheManager = new CacheManager();
  
  const matches = [mockMatches.finishedMatch];
  const ttl = cacheManager.calculateMatchesTTL(matches);
  
  assertEquals(ttl, "24 hours"); // Should use long TTL for finished matches
});

Deno.test("CacheManager - calculateMatchesTTL with recent finished matches", () => {
  const cacheManager = new CacheManager();
  
  const matches = [mockMatches.recentFinishedMatch];
  const ttl = cacheManager.calculateMatchesTTL(matches);
  
  assertEquals(ttl, "15 minutes"); // Recent finished matches get medium TTL
});

Deno.test("CacheManager - calculateMatchesTTL with empty matches", () => {
  const cacheManager = new CacheManager();
  
  const ttl = cacheManager.calculateMatchesTTL([]);
  
  assertEquals(ttl, "15 minutes"); // Should return default TTL
});

Deno.test("CacheManager - calculateIndividualMatchTTL for live match", () => {
  const cacheManager = new CacheManager();
  
  const ttl = cacheManager.calculateIndividualMatchTTL(mockMatches.liveMatch);
  
  assertEquals(ttl, "30 seconds");
});

Deno.test("CacheManager - calculateIndividualMatchTTL for scheduled match today", () => {
  const cacheManager = new CacheManager();
  
  const ttl = cacheManager.calculateIndividualMatchTTL(mockMatches.scheduledMatch);
  
  assertEquals(ttl, "5 minutes"); // More frequent for today's scheduled matches
});

Deno.test("CacheManager - calculateIndividualMatchTTL for future scheduled match", () => {
  const cacheManager = new CacheManager();
  
  const futureMatch = {
    ...mockMatches.scheduledMatch,
    LocalDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow
  };
  
  const ttl = cacheManager.calculateIndividualMatchTTL(futureMatch);
  
  assertEquals(ttl, "15 minutes");
});

Deno.test("CacheManager - calculateIndividualMatchTTL for recent finished match", () => {
  const cacheManager = new CacheManager();
  
  const ttl = cacheManager.calculateIndividualMatchTTL(mockMatches.recentFinishedMatch);
  
  assertEquals(ttl, "1 hour");
});

Deno.test("CacheManager - calculateIndividualMatchTTL for old finished match", () => {
  const cacheManager = new CacheManager();
  
  const ttl = cacheManager.calculateIndividualMatchTTL(mockMatches.finishedMatch);
  
  assertEquals(ttl, "24 hours");
});

Deno.test("CacheManager - generateInvalidationTriggers", () => {
  const cacheManager = new CacheManager();
  
  const oldMatches = [
    { ...mockMatches.scheduledMatch, Status: "Scheduled" }
  ];
  
  const newMatches = [
    { ...mockMatches.scheduledMatch, Status: "Running" }
  ];
  
  const triggers = cacheManager.generateInvalidationTriggers(oldMatches, newMatches);
  
  assertEquals(triggers.length, 1);
  assertEquals(triggers[0].matchNo, "2");
  assertEquals(triggers[0].oldStatus, "Scheduled");
  assertEquals(triggers[0].newStatus, "Running");
});

Deno.test("CacheManager - generateInvalidationTriggers with no changes", () => {
  const cacheManager = new CacheManager();
  
  const oldMatches = [mockMatches.scheduledMatch];
  const newMatches = [mockMatches.scheduledMatch];
  
  const triggers = cacheManager.generateInvalidationTriggers(oldMatches, newMatches);
  
  assertEquals(triggers.length, 0);
});

Deno.test("CacheManager - shouldInvalidateCache for live status transitions", () => {
  const cacheManager = new CacheManager();
  
  const testCases = [
    { oldStatus: "Scheduled", newStatus: "Running", expected: true },
    { oldStatus: "Running", newStatus: "Finished", expected: true },
    { oldStatus: "Running", newStatus: "Suspended", expected: true },
    { oldStatus: "Suspended", newStatus: "Running", expected: true }
  ];
  
  testCases.forEach(({ oldStatus, newStatus, expected }) => {
    const trigger: CacheInvalidationTrigger = {
      matchNo: "1",
      oldStatus,
      newStatus,
      timestamp: new Date().toISOString()
    };
    
    const shouldInvalidate = cacheManager.shouldInvalidateCache(trigger);
    assertEquals(shouldInvalidate, expected);
  });
});

Deno.test("CacheManager - shouldInvalidateCache for non-significant changes", () => {
  const cacheManager = new CacheManager();
  
  const trigger: CacheInvalidationTrigger = {
    matchNo: "1",
    oldStatus: "Finished",
    newStatus: "Finished", // No change
    timestamp: new Date().toISOString()
  };
  
  const shouldInvalidate = cacheManager.shouldInvalidateCache(trigger);
  assertEquals(shouldInvalidate, false);
});

Deno.test("CacheManager - getCacheStatistics", () => {
  const cacheManager = new CacheManager();
  
  const matches = [
    mockMatches.liveMatch,
    mockMatches.scheduledMatch,
    mockMatches.scheduledMatch, // Another scheduled match
    mockMatches.finishedMatch,
    mockMatches.recentFinishedMatch
  ];
  
  const stats = cacheManager.getCacheStatistics(matches);
  
  assertEquals(stats.totalMatches, 5);
  assertEquals(stats.liveMatches, 1);
  assertEquals(stats.scheduledMatches, 2);
  assertEquals(stats.finishedMatches, 2);
  assertEquals(stats.recommendedTTL, "30 seconds"); // Due to live match
  assertEquals(stats.cacheEfficiency, "Low"); // Due to live match
});

Deno.test("CacheManager - getCacheStatistics with scheduled matches only", () => {
  const cacheManager = new CacheManager();
  
  const matches = [
    mockMatches.scheduledMatch,
    mockMatches.scheduledMatch,
    mockMatches.scheduledMatch
  ];
  
  const stats = cacheManager.getCacheStatistics(matches);
  
  assertEquals(stats.totalMatches, 3);
  assertEquals(stats.liveMatches, 0);
  assertEquals(stats.scheduledMatches, 3);
  assertEquals(stats.finishedMatches, 0);
  assertEquals(stats.recommendedTTL, "15 minutes");
  assertEquals(stats.cacheEfficiency, "Medium"); // Over 50% scheduled
});

Deno.test("CacheManager - createCacheKey", () => {
  const cacheManager = new CacheManager();
  
  const basicKey = cacheManager.createCacheKey("12345");
  assertEquals(basicKey, "matches:tournament:12345");
  
  const keyWithData = cacheManager.createCacheKey("12345", { 
    status: "running", 
    date: "2025-01-08" 
  });
  assertEquals(keyWithData, "matches:tournament:12345:status:running:date:2025-01-08");
});

Deno.test("CacheManager - updateTTLConfig", () => {
  const cacheManager = new CacheManager();
  
  const originalConfig = cacheManager.getTTLConfig();
  assertEquals(originalConfig.liveMatches, "30 seconds");
  
  cacheManager.updateTTLConfig({
    liveMatches: "15 seconds",
    scheduledMatches: "10 minutes"
  });
  
  const updatedConfig = cacheManager.getTTLConfig();
  assertEquals(updatedConfig.liveMatches, "15 seconds");
  assertEquals(updatedConfig.scheduledMatches, "10 minutes");
  assertEquals(updatedConfig.finishedMatches, "24 hours"); // Should remain unchanged
});

Deno.test("CacheManager - custom TTL configuration", () => {
  const customConfig: Partial<CacheTTLConfig> = {
    liveMatches: "10 seconds",
    scheduledMatches: "5 minutes",
    finishedMatches: "12 hours"
  };
  
  const cacheManager = new CacheManager(customConfig);
  
  const config = cacheManager.getTTLConfig();
  assertEquals(config.liveMatches, "10 seconds");
  assertEquals(config.scheduledMatches, "5 minutes");
  assertEquals(config.finishedMatches, "12 hours");
  assertEquals(config.defaultTTL, "15 minutes"); // Should use default
});

Deno.test("CacheManager - status matching helpers", () => {
  const cacheManager = new CacheManager();
  
  // Test live status variations
  const liveMatches = [
    { ...mockMatches.liveMatch, Status: "Running" },
    { ...mockMatches.liveMatch, Status: "LIVE" },
    { ...mockMatches.liveMatch, Status: "in progress" },
    { ...mockMatches.liveMatch, Status: "playing" }
  ];
  
  liveMatches.forEach(match => {
    const ttl = cacheManager.calculateIndividualMatchTTL(match);
    assertEquals(ttl, "30 seconds", `Failed for status: ${match.Status}`);
  });
  
  // Test scheduled status variations
  const scheduledMatches = [
    { ...mockMatches.scheduledMatch, Status: "Scheduled" },
    { ...mockMatches.scheduledMatch, Status: "PENDING" },
    { ...mockMatches.scheduledMatch, Status: "upcoming" },
    { ...mockMatches.scheduledMatch, Status: "future" }
  ];
  
  scheduledMatches.forEach(match => {
    const ttl = cacheManager.calculateIndividualMatchTTL(match);
    assertEquals(ttl, "5 minutes", `Failed for status: ${match.Status}`); // Today's scheduled match
  });
  
  // Test finished status variations
  const finishedMatches = [
    { ...mockMatches.finishedMatch, Status: "Finished" },
    { ...mockMatches.finishedMatch, Status: "COMPLETED" },
    { ...mockMatches.finishedMatch, Status: "ended" },
    { ...mockMatches.finishedMatch, Status: "final" }
  ];
  
  finishedMatches.forEach(match => {
    const ttl = cacheManager.calculateIndividualMatchTTL(match);
    assertEquals(ttl, "24 hours", `Failed for status: ${match.Status}`);
  });
});