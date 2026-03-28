FROM node:18-alpine

WORKDIR /app

RUN adduser -D runner

USER runner

CMD ["node", "/app/solution.js"]