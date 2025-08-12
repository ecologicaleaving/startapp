import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { CacheWarmupService } from "../services/CacheWarmupService";

export default function RootLayout() {
  useEffect(() => {
    // Initialize cache warmup service on app start
    const initializeCacheWarmup = async () => {
      try {
        await CacheWarmupService.initialize();
        
        // Schedule periodic warmup every 30 minutes
        CacheWarmupService.schedulePeriodicWarmup(30);
        
        console.log('Cache warmup service initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize cache warmup service:', error);
      }
    };

    initializeCacheWarmup();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="tournament-selection" />
      <Stack.Screen name="tournament-detail" />
      <Stack.Screen name="referee-dashboard" />
      <Stack.Screen name="my-assignments" />
      <Stack.Screen name="assignment-detail" />
      <Stack.Screen name="match-results" />
      <Stack.Screen name="match-detail" />
      <Stack.Screen name="switch-tournament" />
    </Stack>
  );
}
