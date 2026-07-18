# Fanaxo — single-instance production image.
#
# This app is intentionally stateful: SQLite (better-sqlite3) for persistence
# and an in-process event bus for realtime. It MUST run as ONE instance with a
# persistent writable volume (see DEPLOY.md). Do not scale to multiple replicas
# and do not deploy to ephemeral serverless platforms.

FROM node:22-bookworm-slim

# better-sqlite3 compiles a native addon on install if no prebuilt binary is
# available for this platform/Node version; these are the build prerequisites.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Pin pnpm to the version this repo builds with.
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Install dependencies first for better layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/db/package.json packages/db/package.json
RUN pnpm install --frozen-lockfile

# Copy the rest of the source and build every workspace package + the web app.
COPY . .
RUN pnpm build

# Runtime configuration. Secrets (GEMINI_API_KEY, SESSION_SECRET) are injected
# by the host as environment variables — never baked into the image.
ENV NODE_ENV=production
ENV PORT=3000
# Store the SQLite file on the mounted volume (see DEPLOY.md), not the container fs.
ENV DATABASE_FILE=/data/fanaxo.db

# Create the volume mount point so first boot can create the DB file.
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000

# Shell form so ${PORT} (some hosts inject their own) is expanded at runtime.
CMD pnpm --filter @fanaxo/web exec next start -p ${PORT}
