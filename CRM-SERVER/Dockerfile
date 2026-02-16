FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont 

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
PUPPETEER_EXEC_PATH=/usr/bin/chromium-browser

COPY CRM-SERVER/package*.json ./

RUN npm install
    
COPY CRM-SERVER/ .

EXPOSE 5000
CMD ["npm", "start"]
