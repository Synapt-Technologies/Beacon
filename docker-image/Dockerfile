FROM node:20-slim
ARG VERSION=dev
ENV APP_VERSION=$VERSION
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY .yarnrc.yml package.json yarn.lock ./
RUN COREPACK_YES=1 yarn install --immutable
COPY . .
RUN yarn build
ENV NODE_ENV=production
EXPOSE 80 1883 9001
CMD ["node", "dist/app.js"]
