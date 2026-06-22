# --- Build/runtime image for My Budget ---
# better-sqlite3 is a native module, so we build it during install.
FROM node:22-slim AS base

# Build tools needed to compile better-sqlite3.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the app source.
COPY server ./server
COPY public ./public

# Where the SQLite database lives (mounted as a Fly volume in production).
ENV DATA_DIR=/data
ENV PORT=3000
EXPOSE 3000

# Cookies should be marked Secure since Fly serves over HTTPS.
ENV COOKIE_SECURE=true

CMD ["node", "server/index.js"]
