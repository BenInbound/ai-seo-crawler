# AEO Platform - Development Guide

## Quick Start

### Option 1: All-in-one script (Recommended)
```bash
./start-dev.sh
```

This starts all three services (API, Worker, React client) automatically.

### Option 2: Manual start (separate terminals)

**Terminal 1 - API Server:**
```bash
npm run server:dev
```

**Terminal 2 - Background Worker:**
```bash
npm run worker:dev
```

**Terminal 3 - React Client:**
```bash
cd client && npm start
```

## Services

- **API Server**: http://localhost:3001
- **React Client**: http://localhost:3000
- **Worker**: Runs in background, processes crawl jobs

## Important Notes

⚠️ **The worker MUST be running for crawls to work!**

If you see crawls completing with "0/1 pages", it means the worker isn't running.

## Production

**Vercel** (API + Frontend):
- Automatically deploys from `main` branch
- URL: https://ai-seo-crawler.vercel.app

**Railway** (Worker):
- Runs the background worker 24/7
- Processes crawl and scoring jobs
- Check Railway dashboard to ensure it's running

## Troubleshooting

### Pages not showing in UI
- Hard refresh your browser: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows/Linux)

### Crawls complete with 0 pages
- Check if worker is running: `ps aux | grep "server/worker.js"`
- Start worker if not running: `npm run worker:dev`

### Port already in use
- Kill existing processes:
  ```bash
  lsof -ti:3000 | xargs kill -9  # Client
  lsof -ti:3001 | xargs kill -9  # Server
  ```

## Log Files

When using `start-dev.sh`, logs are saved to:
- Server: `/tmp/server.log`
- Worker: `/tmp/worker.log`
- Client: `/tmp/client.log`

View logs: `tail -f /tmp/worker.log`
