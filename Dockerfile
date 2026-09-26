FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY backend/prisma ./backend/prisma
RUN npm --prefix backend ci && npm --prefix frontend ci
COPY backend ./backend
COPY frontend ./frontend
RUN npm --prefix backend run prisma:generate && npm --prefix backend run build && npm --prefix frontend run build && mkdir -p /data && chown -R node:node /app /data
ENV NODE_ENV=production PORT=5000 DATABASE_URL=file:/data/inventory.db SESSION_DB_DIR=/data
USER node
WORKDIR /app/backend
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "npm run db:upgrade && exec node dist/server.js"]
