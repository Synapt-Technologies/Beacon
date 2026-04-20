FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY .yarnrc.yml package.json yarn.lock ./
RUN COREPACK_YES=1 yarn install --immutable
COPY . .
RUN yarn build
ENV NODE_ENV=production
EXPOSE 80 1883 9001
CMD ["node", "dist/app.js"]
