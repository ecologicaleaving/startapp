# Development Environment Setup Guide: Multi-Tier Caching Integration

## Overview
This guide provides step-by-step instructions for setting up the development environment for the multi-tier caching system integration. Follow these steps in order to ensure proper configuration.

## Prerequisites Checklist

### Required Tools
- [ ] Node.js 18+ installed
- [ ] npm or yarn package manager
- [ ] Git version control
- [ ] React Native development environment (Android Studio/Xcode)
- [ ] Expo CLI (`npm install -g expo-cli`)

### Accounts & Services
- [ ] Supabase account (free tier sufficient for development)
- [ ] FIVB VIS API access (existing X-FIVB-App-ID key)
- [ ] GitHub repository access for project

### Development Environment
- [ ] IDE/Editor with TypeScript support (VS Code recommended)
- [ ] Android/iOS simulator or physical device
- [ ] Network connectivity for API testing

---

## Phase 1: Supabase Project Setup

### Step 1: Create Supabase Project

1. **Sign up/Login to Supabase**:
   - Visit https://supabase.com
   - Create account or login with existing credentials
   - Navigate to Dashboard

2. **Create New Project**:
   ```bash
   # Project Details
   Project Name: startapp-tournament-cache
   Database Password: [Generate strong password - save securely]
   Region: [Select closest to target users]
   Plan: Free (sufficient for development)
   ```

3. **Save Project Credentials**:
   ```bash
   # Found in Settings → API
   Project URL: https://[project-id].supabase.co
   Anon Public Key: eyJ... [copy full key]
   Service Role Key: eyJ... [copy full key - keep secure]
   ```

### Step 2: Configure Supabase CLI (Optional but Recommended)

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login and Link Project**:
   ```bash
   supabase login
   supabase link --project-ref [your-project-id]
   ```

3. **Initialize Local Development**:
   ```bash
   # In your project root
   supabase init
   ```

---

## Phase 2: Database Schema Setup

### Step 1: Create Database Tables

1. **Access SQL Editor** in Supabase Dashboard → SQL Editor

2. **Execute Schema Creation Script**:
   ```sql
   -- Copy and execute the complete schema from docs/database-schema.md
   -- Or run individual table creation scripts:

   -- 1. Create tournaments table
   CREATE TABLE tournaments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     no VARCHAR NOT NULL UNIQUE,
     code VARCHAR,
     name VARCHAR,
     start_date DATE,
     end_date DATE,
     status VARCHAR,
     location VARCHAR,
     last_synced TIMESTAMP DEFAULT NOW(),
     version INTEGER DEFAULT 1,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- 2. Create indexes
   CREATE INDEX idx_tournaments_code ON tournaments(code);
   CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);
   CREATE INDEX idx_tournaments_status ON tournaments(status);
   CREATE INDEX idx_tournaments_last_synced ON tournaments(last_synced);

   -- 3. Continue with matches and sync_status tables...
   ```

3. **Verify Tables Created**:
   - Navigate to Table Editor in Supabase Dashboard
   - Confirm all tables appear with correct schema

### Step 2: Configure Row Level Security

1. **Enable RLS on All Tables**:
   ```sql
   ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
   ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
   ```

2. **Create Security Policies**:
   ```sql
   -- Public read access for tournaments
   CREATE POLICY "Allow public read" ON tournaments
     FOR SELECT USING (true);

   -- Service role full access
   CREATE POLICY "Allow service full access" ON tournaments
     FOR ALL USING (auth.role() = 'service_role');

   -- Repeat for matches and sync_status tables
   ```

3. **Test Security**:
   - Use API tab in Supabase to test read operations
   - Verify unauthorized write operations are blocked

---

## Phase 3: React Native Environment Configuration

### Step 1: Install Required Packages

1. **Install Supabase Dependencies**:
   ```bash
   npm install @supabase/supabase-js
   npm install @react-native-async-storage/async-storage
   ```

2. **Install Development Dependencies**:
   ```bash
   npm install --save-dev @types/react-native
   npm install --save-dev jest @testing-library/react-native
   ```

3. **Configure AsyncStorage** (iOS specific):
   ```bash
   cd ios && pod install # iOS only
   ```

### Step 2: Environment Variables Configuration

1. **Create Environment Files**:
   ```bash
   # Create .env file in project root
   touch .env
   touch .env.local
   touch .env.development
   ```

2. **Configure Environment Variables**:
   ```bash
   # .env.development
   EXPO_PUBLIC_SUPABASE_URL=https://[your-project-id].supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ[your-anon-key]

   # For Edge Functions (do not expose in public env)
   SUPABASE_SERVICE_ROLE_KEY=eyJ[your-service-role-key]
   FIVB_APP_ID=2a9523517c52420da73d927c6d6bab23
   ```

3. **Update .gitignore**:
   ```bash
   # Add to .gitignore
   .env.local
   .env.development
   .env.production
   ```

### Step 3: Supabase Client Configuration

1. **Create Supabase Client**:
   ```typescript
   // services/supabaseClient.ts
   import { createClient } from '@supabase/supabase-js';
   import AsyncStorage from '@react-native-async-storage/async-storage';

   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
   const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       storage: AsyncStorage,
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false,
     },
   });
   ```

2. **Test Connection**:
   ```typescript
   // Test in your app or create test script
   import { supabase } from './services/supabaseClient';

   async function testConnection() {
     try {
       const { data, error } = await supabase
         .from('tournaments')
         .select('count(*)', { count: 'exact' });
       
       if (error) throw error;
       console.log('Supabase connection successful:', data);
     } catch (error) {
       console.error('Supabase connection failed:', error);
     }
   }
   ```

---

## Phase 4: Edge Functions Setup

### Step 1: Edge Functions Development Environment

1. **Create Functions Directory Structure**:
   ```bash
   mkdir -p supabase/functions/tournament-sync
   mkdir -p supabase/functions/match-schedule-sync
   mkdir -p supabase/functions/live-score-sync
   ```

2. **Configure Function Environment**:
   ```bash
   # supabase/functions/.env
   SUPABASE_URL=https://[your-project-id].supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ[your-service-role-key]
   FIVB_APP_ID=2a9523517c52420da73d927c6d6bab23
   ```

3. **Install Deno** (for local Edge Functions testing):
   ```bash
   # macOS/Linux
   curl -fsSL https://deno.land/install.sh | sh

   # Windows
   iwr https://deno.land/install.ps1 -useb | iex
   ```

### Step 2: Create Basic Edge Function

1. **Tournament Sync Function**:
   ```typescript
   // supabase/functions/tournament-sync/index.ts
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   }

   serve(async (req) => {
     if (req.method === 'OPTIONS') {
       return new Response('ok', { headers: corsHeaders })
     }

     try {
       // Basic test response
       return new Response(
         JSON.stringify({ 
           success: true, 
           message: 'Tournament sync function deployed',
           timestamp: new Date().toISOString()
         }),
         { headers: { ...corsHeaders, "Content-Type": "application/json" } }
       )
     } catch (error) {
       return new Response(
         JSON.stringify({ success: false, error: error.message }),
         { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       )
     }
   })
   ```

2. **Deploy Function**:
   ```bash
   supabase functions deploy tournament-sync
   ```

3. **Test Function**:
   ```bash
   curl -X POST 'https://[your-project-id].supabase.co/functions/v1/tournament-sync' \
     -H 'Authorization: Bearer [your-anon-key]' \
     -H 'Content-Type: application/json'
   ```

---

## Phase 5: Development Workflow Setup

### Step 1: Testing Environment

1. **Configure Jest for React Native**:
   ```json
   // jest.config.js
   module.exports = {
     preset: 'react-native',
     setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
     testMatch: [
       '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
       '**/*.test.{js,jsx,ts,tsx}'
     ],
     collectCoverageFrom: [
       'services/**/*.{js,ts}',
       'components/**/*.{js,tsx}',
       '!**/*.d.ts',
     ],
   };
   ```

2. **Create Test Setup File**:
   ```javascript
   // jest.setup.js
   import 'react-native-gesture-handler/jestSetup';
   import '@testing-library/jest-native/extend-expect';

   // Mock AsyncStorage
   jest.mock('@react-native-async-storage/async-storage', () =>
     require('@react-native-async-storage/async-storage/jest/async-storage-mock')
   );
   ```

### Step 2: Development Scripts

1. **Add Development Scripts to package.json**:
   ```json
   {
     "scripts": {
       "start": "expo start",
       "android": "expo start --android",
       "ios": "expo start --ios",
       "web": "expo start --web",
       "test": "jest",
       "test:watch": "jest --watch",
       "test:coverage": "jest --coverage",
       "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
       "supabase:start": "supabase start",
       "supabase:stop": "supabase stop",
       "supabase:reset": "supabase db reset"
     }
   }
   ```

2. **Create Development Helper Scripts**:
   ```bash
   # scripts/dev-setup.sh
   #!/bin/bash
   echo "Starting development environment..."
   npm install
   supabase start
   expo start
   ```

### Step 3: Code Quality Setup

1. **Configure ESLint**:
   ```json
   // .eslintrc.js
   module.exports = {
     extends: ['expo', '@react-native-community'],
     rules: {
       'no-unused-vars': 'warn',
       '@typescript-eslint/no-unused-vars': 'warn',
     },
   };
   ```

2. **Configure TypeScript**:
   ```json
   // tsconfig.json additions for Supabase
   {
     "compilerOptions": {
       "types": ["@supabase/supabase-js"],
     }
   }
   ```

---

## Validation Checklist

### Environment Validation

#### Supabase Setup Validation
- [ ] Supabase project accessible via dashboard
- [ ] Database tables created with correct schema
- [ ] RLS policies working (read access successful, write access blocked for anon)
- [ ] API keys configured and connection successful

#### React Native Environment Validation
- [ ] App builds and runs successfully
- [ ] Environment variables loaded correctly
- [ ] Supabase client connects successfully
- [ ] AsyncStorage working (test with simple read/write)

#### Edge Functions Validation
- [ ] Functions deploy successfully
- [ ] Test function returns expected response
- [ ] Environment variables accessible in functions
- [ ] CORS headers configured correctly

#### Testing Environment Validation
- [ ] Jest tests run successfully
- [ ] Coverage reporting working
- [ ] Mocks configured for AsyncStorage and Supabase
- [ ] Linting passes without errors

---

## Common Issues & Troubleshooting

### Supabase Connection Issues

**Issue**: Cannot connect to Supabase database
**Solutions**:
1. Verify project URL and API keys are correct
2. Check network connectivity
3. Ensure environment variables are loaded properly
4. Test connection with simple query in Supabase dashboard

### AsyncStorage Issues

**Issue**: AsyncStorage not working on iOS
**Solutions**:
1. Run `cd ios && pod install`
2. Clean and rebuild project
3. Check iOS deployment target compatibility

### Edge Functions Issues

**Issue**: Edge Functions failing to deploy
**Solutions**:
1. Check Deno installation and version
2. Verify Supabase CLI is latest version
3. Check function syntax and imports
4. Review Supabase dashboard function logs

### Environment Variables Issues

**Issue**: Environment variables not loading
**Solutions**:
1. Verify `.env` file naming and location
2. Restart development server after env changes
3. Check Expo environment variable naming (EXPO_PUBLIC_ prefix)
4. Clear Metro cache: `expo start --clear`

---

## Next Steps

After completing this setup guide:

1. **Verify Everything Works**: Run the validation checklist
2. **Start with Foundation Stories**: Begin Epic 1 development
3. **Set Up CI/CD**: Configure automated testing and deployment
4. **Team Onboarding**: Share this guide with team members
5. **Documentation Updates**: Keep this guide updated as development progresses

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

This setup guide provides a complete development environment configuration for the multi-tier caching system implementation.