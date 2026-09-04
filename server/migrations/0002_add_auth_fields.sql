-- Migration 0002_add_auth_fields.sql
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN auth_provider TEXT DEFAULT 'email';
