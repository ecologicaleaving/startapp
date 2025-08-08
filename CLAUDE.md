# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is an Expo React Native application called "StartApp" built with TypeScript and Expo Router for file-based navigation. The project uses React 19 and React Native 0.79.5 with the new architecture enabled.

## Development Commands

### Core Development
- `npm start` or `npx expo start` - Start the development server
- `npm run android` - Start with Android emulator
- `npm run ios` - Start with iOS simulator  
- `npm run web` - Start web version

### Code Quality
- `npm run lint` - Run ESLint with Expo config

### Project Management
- `npm run reset-project` - Reset to blank project (moves current code to app-example/)

## Architecture

### File-Based Routing
The project uses Expo Router with file-based routing in the `/app` directory:
- `/app/_layout.tsx` - Root layout (currently minimal Stack navigator)
- `/app/index.tsx` - Main screen (currently blank template)

### Example Code Structure
The `/app-example` directory contains a full example implementation with:
- Tab navigation setup in `(tabs)/_layout.tsx`
- Themed components (`ThemedView`, `ThemedText`)
- Custom hooks for color scheme and theme management
- UI components with platform-specific variants (iOS/default)

### Key Patterns
- **Theming**: Uses `@/hooks/useThemeColor` and `@/hooks/useColorScheme` for dark/light mode
- **Path Aliases**: `@/*` maps to root directory (configured in tsconfig.json)
- **Component Structure**: Themed wrapper components extend base React Native components
- **Platform Variants**: Components can have `.ios.tsx` and default `.tsx` variants

### Dependencies
- **Navigation**: React Navigation v7 with bottom tabs and native navigation
- **UI**: Expo Vector Icons, Expo Symbols, Expo Blur effects
- **Development**: TypeScript, ESLint with Expo config
- **Expo SDK**: Version ~53.0.20 with new architecture enabled

## Project State
The current `/app` directory contains only basic template files. The full example implementation with components, hooks, and navigation is preserved in `/app-example` for reference.