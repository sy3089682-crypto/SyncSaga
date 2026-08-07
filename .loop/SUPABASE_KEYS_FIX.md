# Supabase Auth Keys Fix Guide

## Problem
Both Vercel and Render have truncated Supabase anon keys stored as literal strings:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_voslo...Ma3-tD"` (29 chars with literal `...`)
- `SUPABASE_ANON_KEY = "sb_publishable_voslo...Ma3-tD"` (truncated)

The real publishable key is ~160 characters and starts with `sb_publishable_<base64url>`.

## Root Cause
When the keys were initially set, they were truncated in the UI/API responses. Both platforms store the literal truncated string instead of the full key.

## Fix Steps (Manual - Requires Supabase Dashboard Access)

### Step 1: Get Real Publishable Key from Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/hhbjkthpwlgztwcfsmjj/settings/api
2. Scroll to "Project API keys" section
3. Copy the **Publishable key** (starts with `sb_publishable_`, ~160 characters)
4. Save this key securely

### Step 2: Update Vercel Environment Variables
```bash
# Remove old truncated keys
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY preview
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY development

vercel env rm SUPABASE_ANON_KEY production
vercel env rm SUPABASE_ANON_KEY preview
vercel env rm SUPABASE_ANON_KEY development

# Add real key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Paste the REAL publishable key when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview
# Paste the REAL publishable key when prompted

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY development
# Paste the REAL publishable key when prompted

vercel env add SUPABASE_ANON_KEY production
# Paste the REAL publishable key when prompted

vercel env add SUPABASE_ANON_KEY preview
# Paste the REAL publishable key when prompted

vercel env add SUPABASE_ANON_KEY development
# Paste the REAL publishable key when prompted

# Trigger redeploy
vercel --prod
```

### Step 3: Update Render Environment Variables
1. Go to: https://dashboard.render.com/web/srv-d8deprcm0tmc73ds8pqg/env-vars
2. Find `SUPABASE_ANON_KEY` 
3. Replace the truncated value with the REAL publishable key
3. Click "Save Changes"
4. Trigger "Manual Deploy" → "Clear build cache & deploy"

### Step 4: Verify Fix
```bash
# Test login with real credentials
curl -X POST "https://hhbjkthpwlgztwcfsmjj.supabase.co/auth/v1/token?grant_type=password"   -H "apikey: <REAL_PUBLISHABLE_KEY>"   -H "Content-Type: application/json"   -d '{"email":"e2e1785806184@gmail.com","password":"TestPass123!"}'

# Should return 200 with access_token
```

### Verification Checklist
- [ ] Vercel: `NEXT_PUBLIC_SUPABASE_ANON_KEY` set to real key (160 chars, no `...`)
- [ ] Vercel: `SUPABASE_ANON_KEY` set to real key
- [ ] Render: `SUPABASE_ANON_KEY` set to real key
- [ ] Vercel redeployed successfully
- [ ] Render redeployed successfully
- [ ] Login with email/password returns 200
- [ ] Google OAuth works
- [ ] Discord OAuth works
- [ ] Session persists after browser refresh

## Automation Note
The Supabase CLI approach failed due to permission issues. The Management API requires a Personal Access Token from https://supabase.com/dashboard/account/tokens which is not available in this environment.

## After Fix: What Works
- ✅ Email/password login (200 OK)
- ✅ Google OAuth flow
- ✅ Discord OAuth flow
- ✅ Session persistence across browser refresh
- ✅ Real-time features (Socket.io auth)
- ✅ API authentication with Bearer tokens
