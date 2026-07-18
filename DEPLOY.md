# Deploying Fanaxo

Fanaxo is a **stateful single-instance** app: it uses SQLite (`better-sqlite3`)
for persistence and an **in-process event bus** for realtime updates (the live
Gate C → Gate D scenario). It must run as **one instance with a persistent
writable disk**.

| Platform | Works? | Why |
|---|---|---|
| Railway, Render, Fly.io, Docker/VPS | ✅ | One long-running instance + persistent volume |
| Vercel, Netlify, Cloudflare Pages | ❌ | Serverless: ephemeral disk + multiple isolated instances → DB resets and realtime state won't sync across roles |

> Do **not** set replica/instance count above 1. The event bus lives in memory,
> so a second instance wouldn't see the first instance's events.

## Environment variables (set these on your host)

| Variable | Value | Notes |
|---|---|---|
| `AI_PROVIDER` | `google` | `anthropic` for Claude, `mock` for no-AI fallback |
| `GEMINI_API_KEY` | `AIza...` | Free at https://aistudio.google.com/apikey |
| `SESSION_SECRET` | long random string | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_FILE` | `/data/fanaxo.db` | Must live on the **persistent volume** |
| `DEMO_MODE` | `true` | Auto-seeds demo data + demo logins on first boot |
| `NODE_ENV` | `production` | Enables `Secure` session cookies (needs HTTPS, which all these hosts provide) |

The database **auto-migrates and auto-seeds on first request** — no manual DB
step. Demo logins (operator `operator@fanaxo.demo` / `FanaxoOps!2026` / MFA
`123456`, volunteer badges `V-1001`…`V-1008` / code `123456`, and the demo fan
ticket) all exist immediately.

---

## Option A — Railway (recommended, ~5 min)

1. Push this repo to GitHub.
2. On [railway.app](https://railway.app): **New Project → Deploy from GitHub repo** → pick this repo. Railway detects the `Dockerfile`.
3. **Variables** tab → add every variable from the table above.
4. **Volumes** → add a volume mounted at **`/data`** (this is where `DATABASE_FILE` points).
5. Ensure replicas = **1** (Settings). Deploy. Open the generated URL.

## Option B — Render

1. Push to GitHub. On [render.com](https://render.com): **New → Web Service** → connect the repo.
2. **Runtime: Docker** (it uses the `Dockerfile`). Instance type: any paid tier that supports a **Disk** (free tier has no persistent disk).
3. **Advanced → Add Disk**: mount path **`/data`**, size 1 GB.
4. **Environment** → add all variables from the table above.
5. Scaling: **1 instance**. Create Web Service.

## Option C — Any Docker host / VPS

```bash
# Build
docker build -t fanaxo .

# Run (one instance, named volume for the DB, secrets via -e)
docker run -d --name fanaxo -p 3000:3000 \
  -v fanaxo-data:/data \
  -e AI_PROVIDER=google \
  -e GEMINI_API_KEY=AIza...your-key \
  -e SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" \
  -e DATABASE_FILE=/data/fanaxo.db \
  -e DEMO_MODE=true \
  -e NODE_ENV=production \
  fanaxo
```

Put it behind a reverse proxy (Caddy/Nginx/Traefik) for HTTPS — required so the
`Secure` session cookies are accepted by browsers.

---

## Verifying a deploy

1. Open the URL → **Choose a role**.
2. **Operator** → "Sign in as demo operator" → the command center loads; the badge
   should read **"AI: Gemini (live)"** (confirms `GEMINI_API_KEY` is set).
3. **Fan** → verify the demo ticket → open **Assistant** → ask anything → you get a
   grounded Gemini reply.
4. **Operator** → "Simulate surge" → approve the AI recommendation → open a
   **Volunteer** session → the redirect task appears (confirms the in-process bus works).

If the operator badge says "AI: rule-based", `AI_PROVIDER`/`GEMINI_API_KEY` are
not set correctly — the app still works, just with the deterministic copilot.
