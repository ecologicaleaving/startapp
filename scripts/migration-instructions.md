# 🔧 Migration 005 Application Instructions

## 🎯 Goal
Apply the live score schema enhancements so Story 4.2 frontend can be implemented.

## 📋 Required Actions (Choose One Method)

### Method 1: Supabase Dashboard (Recommended - 5 minutes)

1. **Open Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard/project/zjrgyclnaerqkzzupqfv
   - Navigate to: **SQL Editor**

2. **Apply Essential Schema Changes** (minimum required):
   ```sql
   -- Add live score columns (essential for Story 4.2)
   ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_a INTEGER;
   ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_b INTEGER;
   ALTER TABLE matches ADD COLUMN IF NOT EXISTS set_scores JSONB DEFAULT '{}';
   ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_updated_at TIMESTAMP DEFAULT NOW();

   -- Record schema version
   INSERT INTO schema_versions (version, description) VALUES
   ('4.1.0', 'Live Score Enhancement - Essential fields for Story 4.2')
   ON CONFLICT (version) DO NOTHING;
   ```

3. **Click "Run"** - Should complete in ~5 seconds

### Method 2: Full Migration (Complete - 10 minutes)

1. **Open**: `supabase/migrations/005_live_score_enhancements.sql`
2. **Copy entire file contents** (367 lines)
3. **Paste into Supabase Dashboard → SQL Editor**
4. **Click "Run"**

## ✅ Verification Steps

After applying either method, run:
```bash
node scripts/test-api-endpoints.js
```

Expected results:
- ✅ Live score fields accessible
- ⚠️  Still no data (need to trigger sync functions)
- ✅ Real-time subscriptions working

## 🚀 Next Steps After Migration

1. **Trigger Initial Data Sync**:
   - Go to: Supabase Dashboard → Edge Functions
   - Run: `tournament-master-sync`
   - Run: `match-schedule-sync`

2. **Verify Full Readiness**:
   ```bash
   node scripts/test-api-endpoints.js
   ```

3. **Begin Story 4.2 Implementation** when all tests pass ✅

## 🤖 CLI Alternative (Advanced)

If you have Supabase CLI setup with database password:
```bash
npx supabase db push --linked
```

But this requires the database password which we don't have access to.

## ⏰ Time Estimate
- Method 1: 5 minutes
- Method 2: 10 minutes  
- Data sync: 10 minutes
- Total: ~15-20 minutes to full readiness