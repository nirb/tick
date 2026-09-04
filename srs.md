## 1. System Overview & Objective for app called "Tick"

### 1.1 Objective
Build an offline-ready, multi-user Progressive Web Application (PWA) tailored for families and small collaborative groups to organize, assign, track, and complete daily chores, errands, and shared tasks. The application runs entirely serverless on Cloudflare's edge infrastructure with native support for multi-device Web Push notifications (including iOS 16.4+ standalone PWAs and Android browsers).

### 1.2 Core Capabilities
1. **Multi-Tenant Groups (Households):** Group creation, member invites via shareable link or code, role-based visibility (Admin vs. Member).
2. **Task Lifecycle Management:** Task creation, due dates, recurring cadences (daily, weekly, custom), assignee routing, priority flags, and completion states.
3. **PWA & Edge Web Push Notification Engine:** End-to-end VAPID push system natively operating on Cloudflare Workers (WebCrypto / `nodejs_compat`) notifying assignees on assignment, completion, overdue nudges, and chat mentions.
4. **Offline Resilience & Edge Persistence:** Cloudflare D1 serverless SQLite backing data store with client-side cache and offline queueing via Service Worker IndexedDB sync.
5. **Multi-Device Support:** Transparent handling of iOS requirements (mandatory PWA installation via "Add to Home Screen") and Android permission flows.

---

## 2. System Architecture & Tech Stack

### 2.1 Technology Matrix
- **Frontend / Client:**
  - Framework: React 18+ or SvelteKit / Vite SPA.
  - Styling: Tailwind CSS (clean, responsive, mobile-first design system).
  - Hosting: **Cloudflare Pages**.
  - PWA: Custom Service Worker (`sw.js`) implementing `PushEvent`, `NotificationClick`, and offline asset caching via Cache Storage API.
- **Backend / API:**
  - Runtime: **Cloudflare Workers** (TypeScript).
  - Routing: Hono (`hono` lightweight router optimized for Cloudflare Workers).
  - Database: **Cloudflare D1** (Serverless SQLite at the edge).
  - Push Delivery: Web Crypto RFC 8291/RFC 8292 implementation (e.g., `@pushforge/builder` or `web-push` with `nodejs_compat`).
  - Scheduling / Reminders: **Cloudflare Worker Cron Triggers** (`scheduled()` handler).
  - Authentication: Passwordless Magic Links or JWT sessions backed by D1 / Cloudflare Turnstile bot verification.

### 2.2 System Diagram & Information Flow
```text
+-------------------------------------------------------------------------+
|                              Client (PWA)                               |
|  +--------------------------------+   +-------------------------------+ |
|  |       App UI (React/Vite)      |   |   Service Worker (sw.js)      | |
|  | - Task Lists & Assignment Forms|   | - Push Event Listener         | |
|  | - iOS PWA Install Prompt Modal |   | - Background Notification API | |
|  | - IndexedDB Local Sync Cache   |   | - Deep-link Navigation Click  | |
|  +----------------+---------------+   +---------------+---------------+ |
+-------------------|-----------------------------------|-----------------+
                    | HTTPS REST/RPC                    | OS Push Delivery
                    v                                   v
+-------------------------------------------------------+-----------------+
|                       Cloudflare Edge Infrastructure                    |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                     Cloudflare Workers (API)                      |  |
|  | - Hono Router: /api/tasks, /api/groups, /api/push                 |  |
|  | - Auth & Session Middleware                                       |  |
|  | - Push Dispatcher (Signs VAPID & Encrypts Payload via WebCrypto)  |  |
|  +-----------------+-------------------------------------------------+  |
|                    |                                                    |
|         Reads/Writes D1 SQL                                Scheduled Polling
|                    v                                                    v
|  +-----------------------------------+        +----------------------+  |
|  |      Cloudflare D1 (SQLite)       |        | Cloudflare Cron      |  |
|  | - users, groups, tasks,           |        | (Every 15 mins: scan |  |
|  |   push_subscriptions, audits      |        |  overdue & remind)   |  |
|  +-----------------------------------+        +----------------------+  |
+-------------------------------------------------------------------------+
                    |
                    | Outbound HTTPS Encrypted Payload
                    v
    +-----------------------------------------------+
    | Push Services (Google FCM / Apple APNs / Web) |
    +-----------------------------------------------+
3. Database Schema (Cloudflare D1)
SQL
-- Migration 0001_initial_schema.sql

-- 1. Households / Groups
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    avatar_url TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_group_id ON users(group_id);

-- 3. Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    assignee_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_at INTEGER,
    completed_at INTEGER,
    recurrence_rule TEXT, -- e.g., 'FREQ=DAILY', 'FREQ=WEEKLY;BYDAY=MO,TH'
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_group_status ON tasks(group_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);

-- 4. Push Subscriptions (Multi-device per user)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_used_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);

-- 5. Task Activity / Audit Log
CREATE TABLE IF NOT EXISTS task_activities (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('created', 'assigned', 'status_changed', 'commented')),
    details TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);
4. Functional Requirements
4.1 Group & User Authentication
FR-AUTH-1: Users register or sign in using a passwordless Magic Link (or email/pass) and are assigned to a Group.

FR-AUTH-2: Users can generate an invite link/code (groups.invite_code). New users providing this code immediately join the group.

FR-AUTH-3: JWT tokens must be issued by the Worker, signed using HMAC-SHA256 via crypto.subtle, and stored in secure HttpOnly cookies.

4.2 Task Management Lifecycle
FR-TASK-1 (Create): Any group member can create a task specifying title, description, assignee_id, priority, and due_at.

FR-TASK-2 (Assign): Tasks can be reassigned to any member within the same group_id.

FR-TASK-3 (Status Transition): Members can mark tasks as pending, in_progress, or completed. When marked completed, the system updates completed_at = unixepoch().

FR-TASK-4 (Recurrence): If recurrence_rule is defined, completing the task automatically schedules the next iteration instance.

4.3 Web Push Notification Flow
FR-PUSH-1 (Device Registration):

Frontend checks Notification.permission and service worker availability.

On user opt-in, frontend requests registration.pushManager.subscribe() passing the server's public VAPID key.

Subscription endpoint, p256dh, and auth keys are POSTed to /api/push/subscribe.

Stored in D1 table push_subscriptions.

FR-PUSH-2 (User-to-User Event Triggers):

On Task Assignment: When User A assigns a task to User B, backend fetches all active subscriptions for User B and dispatches an encrypted push payload:
{"title": "New Task Assigned", "body": "User A assigned you: Buy Milk", "url": "/tasks/{taskId}"}.

On Task Completed: When User B completes a task created by User A, User A receives a push notification.

On Overdue Nudge: Users can press a "Nudge" button to ping the assignee with a polite reminder.

FR-PUSH-3 (Expired Subscription Pruning): If the remote push gateway (APNs / FCM) returns 404 Not Found or 410 Gone, the Worker must automatically DELETE that subscription row from D1.

4.4 Automated Cron Reminders
FR-CRON-1: Cloudflare Worker configured with a cron = ["*/15 * * * *"] trigger in wrangler.json.

FR-CRON-2: Handler executes query:
SELECT * FROM tasks WHERE status != 'completed' AND due_at BETWEEN unixepoch() AND unixepoch() + 1800.

FR-CRON-3: Dispatches a "Task Due Soon (30 min)" push notification to assignee_id.

5. Non-Functional Requirements & Platform Specifics
5.1 iOS vs. Android Behavioral Requirements
NFR-PLAT-1 (iOS Detection & Onboarding):

Detection logic in client:

JavaScript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
If isIOS && !isStandalone, the application MUST present a clear visual guide:
"To receive task reminders on iPhone: Tap Share ([icon]) -> Add to Home Screen, then launch from your Home Screen."

The notification permission request MUST NOT be triggered until the user explicitly taps an interactive UI element ("Enable Notifications") while in standalone mode.

NFR-PLAT-2 (Android):

Allow notification prompt directly from the browser tab or PWA install banner.

Provide a standard Install App prompt using beforeinstallprompt event.

5.2 Performance & Edge Constraints
NFR-PERF-1: Cloudflare Workers execution duration < 50ms CPU time per request.

NFR-PERF-2: D1 queries indexed to resolve in < 15ms.

NFR-PERF-3: Frontend bundle size < 120KB gzipped for fast loading on cellular networks.

6. API Interface Specification (Hono / Cloudflare Workers)
6.1 Endpoints Overview
Method	Endpoint	Description	Auth Required
POST	/api/auth/magic-link	Sends/verifies access token	No
GET	/api/groups/me	Fetches active user group and members	Yes
GET	/api/tasks	Lists group tasks (filters: status, assignee)	Yes
POST	/api/tasks	Creates task & triggers push to assignee	Yes
PATCH	/api/tasks/:id	Updates status/assignee & triggers push	Yes
POST	/api/tasks/:id/nudge	Sends immediate push reminder to assignee	Yes
POST	/api/push/subscribe	Saves endpoint, p256dh, and auth keys	Yes
DELETE	/api/push/unsubscribe	Removes endpoint from user account	Yes
6.2 Sample API Request/Response
POST /api/push/subscribe
Request Headers: Authorization: Bearer <JWT>

Request Payload:

JSON
{
  "endpoint": "[https://fcm.googleapis.com/fcm/send/](https://fcm.googleapis.com/fcm/send/)...",
  "keys": {
    "p256dh": "BNcRdreALRF8FsII...",
    "auth": "tBHItDaQ..."
  }
}
Response (201 Created):

JSON
{
  "success": true,
  "subscription_id": "sub_90f23ba8"
}
7. Service Worker & Push Implementation Template
7.1 Service Worker (public/sw.js)
JavaScript
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const payload = event.data.json();
  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: payload.url || '/' },
    actions: [
      { action: 'open', title: 'View Task' },
      { action: 'complete', title: 'Mark Done' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Task Update', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
8. Agent Step-by-Step Implementation Instructions
When prompted to build this system, the AI Agent must execute the implementation in the following phased sequence:

Phase 1: Project Scaffolding & Wrangler Config:

Initialize Vite + React/Svelte in client/ and Cloudflare Worker with Hono in server/.

Setup wrangler.json defining D1 binding DB, VAPID environment variables, and nodejs_compat flag.

Phase 2: D1 Migration & Models:

Write SQL migration file matching Section 3 schema. Run wrangler d1 execute <DB> --local --file=....

Phase 3: WebCrypto VAPID Push Dispatcher:

Implement Worker push sender function taking an array of push subscriptions and sending signed payload via standard fetch.

Phase 4: API Endpoints (Hono):

Implement auth middleware, task CRUD operations, and subscription persistence.

Wire task actions to dispatch push notifications to respective user devices.

Phase 5: Client UI & PWA Configuration:

Build manifest (manifest.webmanifest), icons, responsive task board, and assignee selector.

Implement iOS Add-to-Home-Screen guided modal.

Register Service Worker and subscription handshake.

Phase 6: Testing & Verification:

Verify subscription saves in D1.

Test trigger dispatch on task assignment and status updates.

Test 410 Gone error handling when unregistering.
"""

file_name = "family-task-app-srs.md"
with open(file_name, "w", encoding="utf-8") as f:
f.write(srs_content)

print(f"Generated {file_name} successfully.")


```text?code_stdout&code_event_index=1
Generated family-task-app-srs.md successfully.

Your Markdown file is ready

MD icon
family-task-app-srs
 MD 
Highlights of the SRS Document
Architecture & Cloudflare Stack: Full serverless layout covering Cloudflare Pages (Frontend PWA), Cloudflare Workers (API router via Hono), Cloudflare D1 (SQLite database), and Worker Cron triggers for automated due-date reminders.

Database Schema (D1 SQL): Complete, production-ready D1 table migrations for groups, users, tasks, push_subscriptions (multi-device per user), and task_activities.

Cross-Platform Handling (iOS vs. Android): Dedicated requirements (NFR-PLAT-1 & NFR-PLAT-2) handling the iOS standalone requirement (PWA "Add to Home Screen" detection and onboarding UI) versus direct Android installation.

Web Push & Service Worker Specifications: Exact flow and code templates for the client Service Worker (sw.js), VAPID keys, payload formats, deep linking on tap, and handling expired/invalid subscriptions (410 Gone pruning).

Agent Implementation Roadmap: A 6-phase step-by-step checklist formatted specifically for an AI coding agent to scaffold, build, test, and deploy the project.




Gemini is AI and can make mistakes.

# Software Requirements Specification (SRS)
## Project: Family / Group Task Management Progressive Web App (PWA)
**Target Platform:** Cloudflare Ecosystem (Pages, Workers, D1, Queues/Cron)  
**Document Version:** 1.0.0  
**Target Audience:** AI Development Agent / Lead Software Engineer  

---

## 1. System Overview & Objective

### 1.1 Objective
Build an offline-ready, multi-user Progressive Web Application (PWA) tailored for families and small collaborative groups to organize, assign, track, and complete daily chores, errands, and shared tasks. The application runs entirely serverless on Cloudflare's edge infrastructure with native support for multi-device Web Push notifications (including iOS 16.4+ standalone PWAs and Android browsers).

### 1.2 Core Capabilities
1. **Multi-Tenant Groups (Households):** Group creation, member invites via shareable link or code, role-based visibility (Admin vs. Member).
2. **Task Lifecycle Management:** Task creation, due dates, recurring cadences (daily, weekly, custom), assignee routing, priority flags, and completion states.
3. **PWA & Edge Web Push Notification Engine:** End-to-end VAPID push system natively operating on Cloudflare Workers (WebCrypto / `nodejs_compat`) notifying assignees on assignment, completion, overdue nudges, and chat mentions.
4. **Offline Resilience & Edge Persistence:** Cloudflare D1 serverless SQLite backing data store with client-side cache and offline queueing via Service Worker IndexedDB sync.
5. **Multi-Device Support:** Transparent handling of iOS requirements (mandatory PWA installation via "Add to Home Screen") and Android permission flows.

---

## 2. System Architecture & Tech Stack

### 2.1 Technology Matrix
- **Frontend / Client:**
  - Framework: React 18+ or SvelteKit / Vite SPA.
  - Styling: Tailwind CSS (clean, responsive, mobile-first design system).
  - Hosting: **Cloudflare Pages**.
  - PWA: Custom Service Worker (`sw.js`) implementing `PushEvent`, `NotificationClick`, and offline asset caching via Cache Storage API.
- **Backend / API:**
  - Runtime: **Cloudflare Workers** (TypeScript).
  - Routing: Hono (`hono` lightweight router optimized for Cloudflare Workers).
  - Database: **Cloudflare D1** (Serverless SQLite at the edge).
  - Push Delivery: Web Crypto RFC 8291/RFC 8292 implementation (e.g., `@pushforge/builder` or `web-push` with `nodejs_compat`).
  - Scheduling / Reminders: **Cloudflare Worker Cron Triggers** (`scheduled()` handler).
  - Authentication: Passwordless Magic Links or JWT sessions backed by D1 / Cloudflare Turnstile bot verification.

### 2.2 System Diagram & Information Flow
```text
+-------------------------------------------------------------------------+
|                              Client (PWA)                               |
|  +--------------------------------+   +-------------------------------+ |
|  |       App UI (React/Vite)      |   |   Service Worker (sw.js)      | |
|  | - Task Lists & Assignment Forms|   | - Push Event Listener         | |
|  | - iOS PWA Install Prompt Modal |   | - Background Notification API | |
|  | - IndexedDB Local Sync Cache   |   | - Deep-link Navigation Click  | |
|  +----------------+---------------+   +---------------+---------------+ |
+-------------------|-----------------------------------|-----------------+
                    | HTTPS REST/RPC                    | OS Push Delivery
                    v                                   v
+-------------------------------------------------------+-----------------+
|                       Cloudflare Edge Infrastructure                    |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                     Cloudflare Workers (API)                      |  |
|  | - Hono Router: /api/tasks, /api/groups, /api/push                 |  |
|  | - Auth & Session Middleware                                       |  |
|  | - Push Dispatcher (Signs VAPID & Encrypts Payload via WebCrypto)  |  |
|  +-----------------+-------------------------------------------------+  |
|                    |                                                    |
|         Reads/Writes D1 SQL                                Scheduled Polling
|                    v                                                    v
|  +-----------------------------------+        +----------------------+  |
|  |      Cloudflare D1 (SQLite)       |        | Cloudflare Cron      |  |
|  | - users, groups, tasks,           |        | (Every 15 mins: scan |  |
|  |   push_subscriptions, audits      |        |  overdue & remind)   |  |
|  +-----------------------------------+        +----------------------+  |
+-------------------------------------------------------------------------+
                    |
                    | Outbound HTTPS Encrypted Payload
                    v
    +-----------------------------------------------+
    | Push Services (Google FCM / Apple APNs / Web) |
    +-----------------------------------------------+
```

---

## 3. Database Schema (Cloudflare D1)

```sql
-- Migration 0001_initial_schema.sql

-- 1. Households / Groups
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    avatar_url TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_group_id ON users(group_id);

-- 3. Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    assignee_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_at INTEGER,
    completed_at INTEGER,
    recurrence_rule TEXT, -- e.g., 'FREQ=DAILY', 'FREQ=WEEKLY;BYDAY=MO,TH'
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_group_status ON tasks(group_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);

-- 4. Push Subscriptions (Multi-device per user)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_used_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);

-- 5. Task Activity / Audit Log
CREATE TABLE IF NOT EXISTS task_activities (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('created', 'assigned', 'status_changed', 'commented')),
    details TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 4. Functional Requirements

### 4.1 Group & User Authentication
- **FR-AUTH-1:** Users register or sign in using a passwordless Magic Link (or email/pass) and are assigned to a Group.
- **FR-AUTH-2:** Users can generate an invite link/code (`groups.invite_code`). New users providing this code immediately join the group.
- **FR-AUTH-3:** JWT tokens must be issued by the Worker, signed using `HMAC-SHA256` via `crypto.subtle`, and stored in secure `HttpOnly` cookies.

### 4.2 Task Management Lifecycle
- **FR-TASK-1 (Create):** Any group member can create a task specifying `title`, `description`, `assignee_id`, `priority`, and `due_at`.
- **FR-TASK-2 (Assign):** Tasks can be reassigned to any member within the same `group_id`.
- **FR-TASK-3 (Status Transition):** Members can mark tasks as `pending`, `in_progress`, or `completed`. When marked `completed`, the system updates `completed_at = unixepoch()`.
- **FR-TASK-4 (Recurrence):** If `recurrence_rule` is defined, completing the task automatically schedules the next iteration instance.

### 4.3 Web Push Notification Flow
- **FR-PUSH-1 (Device Registration):**
  - Frontend checks `Notification.permission` and service worker availability.
  - On user opt-in, frontend requests `registration.pushManager.subscribe()` passing the server's public VAPID key.
  - Subscription endpoint, `p256dh`, and `auth` keys are POSTed to `/api/push/subscribe`.
  - Stored in D1 table `push_subscriptions`.
- **FR-PUSH-2 (User-to-User Event Triggers):**
  - **On Task Assignment:** When User A assigns a task to User B, backend fetches all active subscriptions for User B and dispatches an encrypted push payload:
    `{"title": "New Task Assigned", "body": "User A assigned you: Buy Milk", "url": "/tasks/{taskId}"}`.
  - **On Task Completed:** When User B completes a task created by User A, User A receives a push notification.
  - **On Overdue Nudge:** Users can press a "Nudge" button to ping the assignee with a polite reminder.
- **FR-PUSH-3 (Expired Subscription Pruning):** If the remote push gateway (APNs / FCM) returns `404 Not Found` or `410 Gone`, the Worker must automatically DELETE that subscription row from D1.

### 4.4 Automated Cron Reminders
- **FR-CRON-1:** Cloudflare Worker configured with a `cron = ["*/15 * * * *"]` trigger in `wrangler.json`.
- **FR-CRON-2:** Handler executes query:
  `SELECT * FROM tasks WHERE status != 'completed' AND due_at BETWEEN unixepoch() AND unixepoch() + 1800`.
- **FR-CRON-3:** Dispatches a "Task Due Soon (30 min)" push notification to `assignee_id`.

---

## 5. Non-Functional Requirements & Platform Specifics

### 5.1 iOS vs. Android Behavioral Requirements
- **NFR-PLAT-1 (iOS Detection & Onboarding):**
  - Detection logic in client:
    ```javascript
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    ```
  - If `isIOS && !isStandalone`, the application MUST present a clear visual guide:
    *"To receive task reminders on iPhone: Tap Share ([icon]) -> Add to Home Screen, then launch from your Home Screen."*
  - The notification permission request MUST NOT be triggered until the user explicitly taps an interactive UI element ("Enable Notifications") while in standalone mode.
- **NFR-PLAT-2 (Android):**
  - Allow notification prompt directly from the browser tab or PWA install banner.
  - Provide a standard Install App prompt using `beforeinstallprompt` event.

### 5.2 Performance & Edge Constraints
- **NFR-PERF-1:** Cloudflare Workers execution duration < 50ms CPU time per request.
- **NFR-PERF-2:** D1 queries indexed to resolve in < 15ms.
- **NFR-PERF-3:** Frontend bundle size < 120KB gzipped for fast loading on cellular networks.

---

## 6. API Interface Specification (Hono / Cloudflare Workers)

### 6.1 Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/magic-link` | Sends/verifies access token | No |
| `GET` | `/api/groups/me` | Fetches active user group and members | Yes |
| `GET` | `/api/tasks` | Lists group tasks (filters: status, assignee) | Yes |
| `POST` | `/api/tasks` | Creates task & triggers push to assignee | Yes |
| `PATCH` | `/api/tasks/:id` | Updates status/assignee & triggers push | Yes |
| `POST` | `/api/tasks/:id/nudge` | Sends immediate push reminder to assignee | Yes |
| `POST` | `/api/push/subscribe` | Saves endpoint, p256dh, and auth keys | Yes |
| `DELETE`| `/api/push/unsubscribe` | Removes endpoint from user account | Yes |

### 6.2 Sample API Request/Response

#### `POST /api/push/subscribe`
**Request Headers:** `Authorization: Bearer <JWT>`  
**Request Payload:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BNcRdreALRF8FsII...",
    "auth": "tBHItDaQ..."
  }
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "subscription_id": "sub_90f23ba8"
}
```

---

## 7. Service Worker & Push Implementation Template

### 7.1 Service Worker (`public/sw.js`)
```javascript
self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const payload = event.data.json();
  const options = {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    data: { url: payload.url || '/' },
    actions: [
      { action: 'open', title: 'View Task' },
      { action: 'complete', title: 'Mark Done' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Task Update', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = event.notification.data.url;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
```

---

## 8. Agent Step-by-Step Implementation Instructions

When prompted to build this system, the AI Agent must execute the implementation in the following phased sequence:

1. **Phase 1: Project Scaffolding & Wrangler Config:**
   - Initialize Vite + React/Svelte in `client/` and Cloudflare Worker with Hono in `server/`.
   - Setup `wrangler.json` defining D1 binding `DB`, VAPID environment variables, and `nodejs_compat` flag.
2. **Phase 2: D1 Migration & Models:**
   - Write SQL migration file matching Section 3 schema. Run `wrangler d1 execute <DB> --local --file=...`.
3. **Phase 3: WebCrypto VAPID Push Dispatcher:**
   - Implement Worker push sender function taking an array of push subscriptions and sending signed payload via standard `fetch`.
4. **Phase 4: API Endpoints (Hono):**
   - Implement auth middleware, task CRUD operations, and subscription persistence.
   - Wire task actions to dispatch push notifications to respective user devices.
5. **Phase 5: Client UI & PWA Configuration:**
   - Build manifest (`manifest.webmanifest`), icons, responsive task board, and assignee selector.
   - Implement iOS Add-to-Home-Screen guided modal.
   - Register Service Worker and subscription handshake.
6. **Phase 6: Testing & Verification:**
   - Verify subscription saves in D1.
   - Test trigger dispatch on task assignment and status updates.
   - Test 410 Gone error handling when unregistering.
   - I want to be able to run the client localiy for development, so when i work on it, i will have access to the API and d1 on cloudflare (not a local one). 