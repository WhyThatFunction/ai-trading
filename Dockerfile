# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock tsconfig.json swc.config.json ./
COPY src ./src
COPY config.yaml ./
RUN yarn install && yarn build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --production
COPY --from=build /app/dist ./dist
COPY config.yaml ./config.yaml
CMD ["node", "dist/index.js"]
