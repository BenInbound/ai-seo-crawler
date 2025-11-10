# Railway Worker Deployment Guide

This guide will help you deploy the background worker to Railway so production crawls work.

## Prerequisites

- Railway account (sign up at https://railway.app - free tier available)
- This GitHub repository pushed to GitHub

## Step-by-Step Deployment

### 1. Create Railway Project

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Authorize Railway to access your GitHub
4. Select the `ai-seo-crawler` repository
5. Railway will detect the Node.js project

### 2. Configure Environment Variables

In the Railway dashboard, go to **Variables** tab and add these:

**Required:**
```
NODE_ENV=production
REDIS_URL=<your-upstash-redis-url>
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
JWT_SECRET=<same-as-vercel>
OPENAI_API_KEY=<your-openai-api-key>
```

**Optional:**
```
USER_AGENT=AEO-Platform-Bot/1.0
CRAWL_DELAY_MS=1000
```

### 3. Get Environment Variable Values

You can copy them from Vercel:

```bash
# Pull Vercel production environment variables
vercel env pull .env.railway

# Copy the values from .env.railway to Railway dashboard
# Then delete the file for security
rm .env.railway
```

### 4. Deploy

1. Railway will automatically deploy when you push to GitHub
2. Or click **"Deploy Now"** in the Railway dashboard
3. Check the **Deployments** tab to see the build logs
4. Look for: `AEO Platform - Background Worker` and `Crawl worker started`

### 5. Verify It's Working

In Railway logs, you should see:
```
============================================================
AEO Platform - Background Worker
============================================================
Environment: production
Redis URL: rediss://...
============================================================
Crawl worker started - listening for jobs
Scoring worker started - listening for jobs
```

### 6. Test Production Crawls

1. Go to https://ai-seo-crawler.vercel.app
2. Log in
3. Navigate to a project
4. Click **"Start Crawl"**
5. Should change from "queued" to "running" within seconds

## Troubleshooting

### Worker Not Processing Jobs

**Check Railway Logs:**
- Go to Railway dashboard → Deployments → View Logs
- Look for connection errors to Redis or Supabase

**Common Issues:**

1. **Redis connection failed:**
   - Check `REDIS_URL` is correct (should start with `rediss://`)
   - Verify Redis is accessible from Railway

2. **Supabase connection failed:**
   - Check all Supabase environment variables are set
   - Verify `SUPABASE_SERVICE_ROLE_KEY` (not anon key)

3. **Worker crashes on startup:**
   - Check for missing environment variables in logs
   - Verify `NODE_ENV=production` is set

### Jobs Still Stuck at "Queued"

1. Check Railway worker is running (not crashed)
2. Verify Redis URL is the same on Vercel and Railway
3. Check Railway logs for job processing messages
4. Try starting a new crawl (old ones won't retry automatically)

## Monitoring

**Railway Dashboard:**
- **Metrics** tab: CPU/Memory usage
- **Deployments** tab: Build history and logs
- **Observability** tab: Real-time logs

**Expected Behavior:**
- Worker should use minimal resources when idle
- CPU spike when processing crawls
- Memory usage depends on crawl size

## Cost

**Railway Free Tier:**
- $5 free credit per month
- Should be enough for development/testing
- Upgrade to Hobby plan ($5/month) for production

**Estimated Usage:**
- Worker running 24/7: ~$2-3/month
- Varies based on crawl frequency and size

## Alternative: Run Worker Locally for Development

If you want to test production crawls without Railway:

1. Copy production environment variables to local `.env`
2. Run `npm run worker:dev` locally
3. Your local worker will process production crawl jobs
4. **Note:** Your computer must be on and worker running

This is fine for testing but not suitable for production users.

## Updating the Worker

Railway auto-deploys when you push to GitHub:

```bash
git add .
git commit -m "Update worker code"
git push origin main
```

Railway will automatically:
1. Pull the latest code
2. Build and deploy
3. Restart the worker (jobs will resume after restart)

## Questions?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check logs in Railway dashboard for specific errors
