FROM node:18-slim

# Install GraphicsMagick and Ghostscript
RUN apt-get update && \
    apt-get install -y graphicsmagick ghostscript && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]