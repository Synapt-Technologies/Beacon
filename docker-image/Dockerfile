FROM node:20-alpine
WORKDIR /app
RUN corepack enable && apk add --no-cache python3 make g++
COPY .yarnrc.yml package.json yarn.lock ./
RUN COREPACK_YES=1 YARN_ENABLE_SCRIPTS=false yarn install --immutable
RUN yarn rebuild better-sqlite3
COPY . .
RUN yarn build
ENV NODE_ENV=production
EXPOSE 80 1883 9001
CMD ["node", "dist/app.js"]
