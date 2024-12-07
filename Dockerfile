FROM node:18-slim

WORKDIR /app

# Install system dependencies for canvas
RUN apt-get update && \
    apt-get install -y \
    poppler-utils \
    sqlite3 && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./
RUN npm install

# Create and set permissions for temp directory
RUN mkdir -p /tmp/pdf-converter && \
    chmod 777 /tmp/pdf-converter

# Create and set permissions for file storage
RUN mkdir -p /data/files && \
    chmod 777 /data/files

# Copy the rest of the application
COPY . .

# Verify temp directory
RUN ls -l /tmp/pdf-converter

EXPOSE 3000


# Default command: switch between development and production based on NODE_ENV
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then npm run dev; else npm start; fi"]
