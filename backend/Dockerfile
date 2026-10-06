FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
ENV PORT=8080 DB_PATH=/app/data/yamalaw.sqlite UPLOAD_DIR=/app/uploads
EXPOSE 8080
CMD ["node", "src/index.js"]
