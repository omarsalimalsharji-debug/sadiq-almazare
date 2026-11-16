FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
ARG VITE_ANDROID_APK_URL
ENV VITE_ANDROID_APK_URL=${VITE_ANDROID_APK_URL}
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/mnt/data \
    MEDIA_STORE_DIR=/mnt/media_store

COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/server.ts ./server.ts
COPY --from=build --chown=node:node /app/src ./src
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/media_store ./seed-media
COPY --chown=node:node scripts/cloud-run-start.sh ./cloud-run-start.sh

EXPOSE 8080
USER node
CMD ["sh", "./cloud-run-start.sh"]
