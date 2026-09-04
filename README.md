# Tick - Family Task & Chore Progressive Web App (Cloudflare Stack)

Tick is an offline-ready, multi-user Progressive Web Application (PWA) tailored for families and small collaborative groups to organize, assign, track, and complete daily chores, errands, and shared tasks.

The system runs entirely serverless on Cloudflare's edge infrastructure with native support for multi-device Web Push notifications (including iOS 16.4+ standalone PWAs and Android browsers).

---

## Architecture & Tech Stack

- **Frontend / Client (`client/`)**:
  - React 19 + TypeScript + Vite + Tailwind CSS
  - Custom Service Worker (`sw.js`) handling Web Push (`PushEvent`), deep-link navigation (`notificationclick`), and App Shell caching
  - IndexedDB offline local cache (`idb-keyval`)
  - iOS 16.4+ Standalone detection & Add-to-Home-Screen onboarding modal
  - Android `beforeinstallprompt` installation banner
  - Web Push client handshake & test notification trigger

- **Backend / API (`server/`)**:
  - Cloudflare Workers (TypeScript) with **Hono** routing
  - **Cloudflare D1** serverless SQLite database (`tick-db`)
  - Edge Web Push delivery using WebCrypto (`@pushforge/builder`) with automated 404/410 dead subscription pruning
  - Cloudflare Worker Cron Triggers (`*/15 * * * *`) for automated 30-minute due date nudges
  - Passwordless Magic Link & HMAC-SHA256 JWT sessions via `crypto.subtle`

---

## Live Cloudflare Deployments

- **API Worker:** `https://tick-api.bejeranos.workers.dev`
- **D1 Database:** `tick-db` (`e8b9fbfa-5b2f-4e1c-be2d-174df3a966a6`)
- **VAPID Public Key:** `BGpovX6SzcvQn35tqU1alOjzAeEeXbgeIdZzdx-ov0G70BPK3Qdjc0YtC9D-ImyHVXfBlpzXgwDeRiuTHREb9qY`
- **Cron Triggers:** Active every 15 minutes (`*/15 * * * *`)

---

## Development Setup

### 1. Run Client Locally (with live Cloudflare API & D1)
The Vite dev server is pre-configured to proxy `/api/*` requests directly to `https://tick-api.bejeranos.workers.dev`, allowing seamless local frontend development against the live Cloudflare D1 database:

```bash
npm run dev
# App will run at http://localhost:5173
```

### 2. Run Worker Locally
```bash
# Local D1 SQLite
npm run dev:server

# Or local worker connected to remote Cloudflare D1
npm run dev:server:remote
```

### 3. Deploy Worker to Cloudflare
```bash
npm run deploy:server
```

### 4. Build Client for Production / Cloudflare Pages
```bash
npm run build
# Output in client/dist/
```

---

## Instant Family Persona Switcher
For easy multi-device & multi-user testing:
- **Sarah (Mom)** - Admin (`sarah.mom@tickfamily.app`)
- **Alex (Dad)** - Member (`alex.dad@tickfamily.app`)
- **Leo (Teen)** - Member (`leo.teen@tickfamily.app`)
- **Family Invite Code:** `TICKFAM`
