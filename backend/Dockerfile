FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

EXPOSE 4000

# On every start: create the DB if missing, apply pending migrations, seed (admin + sample data only into an empty DB), run the API.
CMD ["sh", "-c", "node db/create-db.js && node db/migrate.js up && node db/seed.js && node src/server.js"]
