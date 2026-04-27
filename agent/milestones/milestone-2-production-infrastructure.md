# Milestone 2: Production Infrastructure

**Status**: ✅ Complete
**Versions**: v0.4.0
**Completed**: 2026-04-26

## Goal

Deploy Iris to Cloudflare Workers with real auth, conversation persistence, and a custom domain. Keep the Node server for local dev.

## Deliverables

- [x] Cloudflare Worker (`worker/index.ts`) with WebSocketPair
- [x] D1 database with users, sessions, conversations, messages tables
- [x] Email + password auth (PBKDF2, session cookies, signup/login/logout/me)
- [x] WebSocket gated on auth (401 if no session)
- [x] Per-user conversation persistence in D1
- [x] History replay on WS connect
- [x] Custom domain: askiris.site + www.askiris.site
- [x] `npm run deploy` (vite build + wrangler deploy)
- [x] Secrets via `wrangler secret put`
- [x] Blob-to-ArrayBuffer fix for Workers WebSocket binary frames
