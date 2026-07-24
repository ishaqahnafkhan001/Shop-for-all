FROM node:22-alpine AS dependencies

WORKDIR /app

# The backend consumes this local package through
# file:../../packages/storefront-theme, so it must exist before npm ci.
COPY packages/storefront-theme ./packages/storefront-theme
COPY ecommerce-backend/backend/package.json ecommerce-backend/backend/package-lock.json ./ecommerce-backend/backend/

WORKDIR /app/ecommerce-backend/backend
RUN npm ci --omit=dev --no-audit --no-fund

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node packages/storefront-theme ./packages/storefront-theme
COPY --chown=node:node ecommerce-backend/backend ./ecommerce-backend/backend
COPY --from=dependencies --chown=node:node /app/ecommerce-backend/backend/node_modules ./ecommerce-backend/backend/node_modules

WORKDIR /app/ecommerce-backend/backend
USER node

EXPOSE 4000

CMD ["npm", "start"]
