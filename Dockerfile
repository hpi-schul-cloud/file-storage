FROM docker.io/node:24-alpine AS builder

WORKDIR /app

COPY tsconfig.json tsconfig.build.json package.json package-lock.json nest-cli.json ./

RUN npm ci --ignore-scripts && npm cache clean --force

COPY src ./src

RUN npm run build
RUN npm prune --production

FROM registry.opencode.de/oci-community/images/zendis/nodejs:24-minimal AS file-service

WORKDIR /app

ENV NODE_ENV=production
ENV NO_COLOR="true"

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER nonroot

EXPOSE 3345 3349 9090

CMD ["node", "dist/apps/files-storage.app.js"]

FROM docker.io/node:24-alpine AS preview-service

RUN apk add --no-cache \
    imagemagick \
    imagemagick-heic \
    imagemagick-jpeg \
    imagemagick-pdf \
    imagemagick-raw \
    imagemagick-svg \
    imagemagick-tiff \
    imagemagick-webp

WORKDIR /app

ENV NODE_ENV=production
ENV NO_COLOR="true"

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY imagemagic_policy.xml /etc/ImageMagick-7/policy.xml

USER node

EXPOSE 3345 3349 9090

CMD ["node", "dist/apps/preview-generator-consumer.app.js"]
