# Skill: WebPush Notifier

## Responsibilities:
- Manage VAPID signing using WebCrypto.
- Generate standard notification payloads (`title`, `body`, `url`, `actions`).
- Handle push gateway responses:
  - If status is 410 or 404: dispatch a query to delete the endpoint from `push_subscriptions`.

## Reference Implementation:
Use standard WebCrypto for signing:
`await crypto.subtle.importKey(...)`
Do NOT import native Node `crypto` unless `nodejs_compat` is explicitly configured in `wrangler.json`.