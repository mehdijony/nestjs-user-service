## 🧠 5) `docs/ARCHITECTURE.md` (internals)

I’ll explain:

- **Generators**: `ProjectGenerator`, `AuthGenerator`, `DatabaseGenerator`, `DockerGenerator`, `DocsGenerator`
- **Setup**: `ProjectDetector`, `Installer`, `BackupManager`, `prompts`
- **Restore point structure**: `.user-service-backup/manifest.json`, tracked files/deps, rollback flow
- **Where files land**: `src/user-service/**`, injected imports, `.env` append rules, `docker-compose.yml` merge rules
- **Dependency resolution**: `dependencies.map.ts` + `feature.matrix.ts`

---
