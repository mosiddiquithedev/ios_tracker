# 📡 App Radar — iOS App Discovery System

Discover newly released iOS apps from the Apple App Store. A crawler sweeps the iTunes Search API using alphabet-based queries, stores results in Supabase (PostgreSQL), and a React dashboard lets you browse, filter, and sort apps by release date.

![Stack](https://img.shields.io/badge/React-Vite-blue) ![Stack](https://img.shields.io/badge/Supabase-PostgreSQL-green) ![Stack](https://img.shields.io/badge/Node.js-Crawler-yellow)

## Architecture

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│   Crawler    │────▶│  Supabase (PgSQL)  │◀────│  React App   │
│  (Node.js)   │     │  REST API + Auth   │     │  (Vite)      │
│  CLI script  │     │  RLS policies      │     │  Dashboard   │
└──────────────┘     └───────────────────┘     └──────────────┘
```

## Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **anon/public** key from Settings → API
3. Copy your **service_role** key (keep this secret, used only by the crawler)

### 2. Run the SQL Migration

Open the SQL Editor in your Supabase Dashboard and run the contents of `supabase-migration.sql`.

> **Note:** The `gin_trgm_ops` index requires the `pg_trgm` extension. Enable it first from the Dashboard: Database → Extensions → search "pg_trgm" → Enable. If you skip this, just remove the `idx_apps_name` index line from the migration.

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
CRAWL_DELAY_MS=300
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Also create `client/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 4. Install Dependencies

```bash
# Install all (root + crawler + client)
cd crawler && npm install && cd ../client && npm install && cd ..
```

### 5. Run the Crawler

```bash
# Full sweep: a-z + aa-zz (702 queries, ~4 min)
node crawler/index.js

# Quick mode: a-z only (26 queries, ~10 sec)
node crawler/index.js --letters-only
```

### 6. Start the Dashboard

```bash
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Features

| Feature | Description |
|---------|-------------|
| 🔍 Alphabet Sweep | Discovers apps using a-z and aa-zz search queries |
| 🗓️ Date Filters | Filter by Today, Yesterday, This Week, This Year |
| 🔎 Search | Search apps by name |
| 📄 Pagination | 50 apps per page |
| 🔄 Deduplication | Uses `trackId` as primary key |
| 📊 Stats Dashboard | Total apps, today's count, weekly count, categories |
| 🎨 Dark Mode UI | Glassmorphic cards with gradient accents |

## Scheduling (Optional)

Use cron to run the crawler automatically:

```bash
# Edit crontab
crontab -e

# Run every 6 hours
0 */6 * * * cd /path/to/ios-app-discovery && node crawler/index.js >> crawler.log 2>&1
```

---

## Deploy on VPS

### 1. Server Setup

```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and install
git clone <your-repo-url> /opt/ios-app-discovery
cd /opt/ios-app-discovery
cd crawler && npm install && cd ../client && npm install && cd ..

# Set environment variables
cp .env.example .env
nano .env  # Add your Supabase credentials
cp .env.example client/.env
nano client/.env  # Add VITE_ vars only
```

### 2. Build Frontend

```bash
cd client && npm run build
```

### 3. Serve with Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /opt/ios-app-discovery/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Schedule Crawler with PM2

```bash
npm install -g pm2

# Run crawler on schedule (every 6 hours)
pm2 start crawler/index.js --name "app-crawler" --cron "0 */6 * * *" --no-autorestart
pm2 save
pm2 startup
```

## License

MIT
