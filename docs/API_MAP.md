## 🗺️ 4) `docs/API_MAP.md` (complete API reference)

I’ll document **every endpoint your code generates**, including:

- Auth: register/login, OTP send/verify, magic link, OAuth callbacks, refresh, logout, password reset
- Users: list, me, get/update/delete
- 2FA: enable/verify/disable (if enabled)
- RBAC: roles/permissions endpoints (if enabled)
- Device/session management (if enabled)
- Example request/response payloads (JSON)
- Headers (Authorization: Bearer …)
- Swagger tags and operation summaries

_(Pulled directly from `auth.controller.ts`, `user.controller.ts`, and feature generators.)_

---
