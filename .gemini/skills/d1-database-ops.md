# Skill: Cloudflare D1 Database Operations

## Purpose & Scope
Provides parameterized query patterns, transactional rules, and TypeScript repository methods for Cloudflare D1 (Serverless SQLite at the edge) conforming to the project schema.

---

## 1. Core Rules
- **Prepared Statements Only:** Never interpolate strings into SQL. Always use `.prepare("...").bind(...)`.
- **Primary Keys:** Generate UUIDv4 strings via `crypto.randomUUID()`.
- **Timestamps:** Store all dates as integer Unix epoch seconds using SQLite `unixepoch()` or `Math.floor(Date.now() / 1000)`.
- **Atomic Mutations:** Use `env.DB.batch([...])` for multi-table updates (e.g., tasks + activity logs).

---

## 2. D1 Schema Reference

```sql
CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

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
    recurrence_rule TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_group_status ON tasks(group_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);

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