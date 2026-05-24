FROM node:20-slim AS builder

# Install dependencies for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn prisma:generate
RUN yarn build
# Compile seed.ts to JavaScript
RUN npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --skipLibCheck --target ES2020 --module commonjs

# ---- production image ----
FROM node:20-slim AS runner

# Install dependencies for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

EXPOSE 3000

CMD ["sh", "-c", "yarn prisma:migrate:deploy && node dist/prisma/seed.js && node dist/src/main || node dist/main"]
