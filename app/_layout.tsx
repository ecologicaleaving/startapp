import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { CacheWarmupService } from "../services/CacheWarmupService";
import { preloadBrandAssets } from "../assets/brand";
import { colors } from "../theme/tokens";

export default function RootLayout() {
  useEffect(() => {
    // Initialize cache warmup service and brand assets on app start
    const initializeApp = async () => {
      try {
        // Initialize brand assets
        await preloadBrandAssets();
        console.log('Brand assets preloaded successfully');
        
        // Initialize cache warmup service
        await CacheWarmupService.initialize();
        
        // Schedule periodic warmup every 30 minutes
        CacheWarmupService.schedulePeriodicWarmup(30);
        
        console.log('Cache warmup service initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize app services:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <>
      <StatusBar 
        style="light" 
        backgroundColor={colors.primary}
      />
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: colors.background }
      }}>
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
    </>
  );
}
