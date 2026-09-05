-- Migration 0003_multi_group_membership.sql

CREATE TABLE IF NOT EXISTS group_members (
    user_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    joined_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (user_id, group_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);

-- Backfill existing memberships from users table
INSERT OR IGNORE INTO group_members (user_id, group_id, role, joined_at)
SELECT id, group_id, role, created_at FROM users WHERE group_id IS NOT NULL;
