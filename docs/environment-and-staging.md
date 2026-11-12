# Environment and staging

## Ownership

| Scope | Variables |
|---|---|
| Shared API/Worker | `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `AI_CREDENTIAL_ENCRYPTION_KEY`, `INTEGRATION_TOKEN_ENCRYPTION_KEY` |
| API-only | `PORT`, `WEB_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, OAuth provider credentials, mail/SMS credentials |
| Web-only | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WIDGET_URL`, Google Picker public key/project number |
| Test-only | `CRM_TEST_DATABASE_URL` (must never fallback to `DATABASE_URL`) |

## Rules

- Root `.env.local` is the local source for API/Worker/DB scripts. It is ignored by Git.
- Web and Widget must only receive `NEXT_PUBLIC_*` variables they use at build time. Do not copy database, OAuth client secrets, encryption keys, or Clerk server keys into their `.env.local` files.
- Staging uses a dedicated Neon database and separate secrets; never reuse production credentials.
- Redis remains private to the Oracle VM/Docker network. PostgreSQL is Neon-managed and restricted by credentials.

## Local frontend cleanup

The source currently uses only the variables in `apps/web/.env.example` and
`apps/widget/.env.example`. Before deleting any old local file, preserve a
private backup outside the repository, then replace its contents with the
matching template values for local development. Do not copy values from the
root backend `.env.local` into Web or Widget files. In PowerShell:

```powershell
Copy-Item apps/web/.env.local "$env:USERPROFILE/.echochatbot-web-env.backup"
Copy-Item apps/widget/.env.local "$env:USERPROFILE/.echochatbot-widget-env.backup"
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/widget/.env.example apps/widget/.env.local
```

Then replace only public placeholder values. The backups are outside the repo
and remain ignored. If a legacy local script fails afterwards, restore its
backup, identify the variable it needs, and move that server-only setting to
the root backend environment instead.

## Staging checklist

1. Create Neon staging branch/database and set `DATABASE_URL` only in the VM secret file.
2. Configure Vercel Web/Widget with public API/widget URLs only.
3. Configure API/Worker on the VM with root backend secrets; do not expose them through Nginx or frontend builds.
4. Set GitHub Environment `staging` secrets: `STAGING_HOST`, `STAGING_SSH_PRIVATE_KEY`, `STAGING_SSH_KNOWN_HOSTS`.
5. Run migrations manually after backup/review; deployment workflow never migrates.
6. Smoke-test HTTPS, login, organization selection, widget chat, RAG, inbox/handoff, CRM, worker, and `/health`.
