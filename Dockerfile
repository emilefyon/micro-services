# Base image
FROM node:18-slim

# Set working directory
WORKDIR /app

# Copy policy file first
COPY policy.xml /app/policy.xml

# Install system dependencies and configure ImageMagick
RUN apt-get update && \
    apt-get install -y graphicsmagick ghostscript imagemagick libmagickwand-dev libgs-dev && \
    mkdir -p /etc/ImageMagick-6 && \
    cp /app/policy.xml /etc/ImageMagick-6/policy.xml && \
    chmod 644 /etc/ImageMagick-6/policy.xml && \
    mkdir -p /tmp/pdf-converter && \
    chmod 777 /tmp/pdf-converter && \
    ln -s /usr/bin/gm /usr/local/bin/gm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . ./

# Verify installations and permissions
RUN gm version && \
    convert -version && \
    ls -l /etc/ImageMagick-6/policy.xml

# Expose application port
EXPOSE 3000

# Default command: switch between development and production based on NODE_ENV
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"development\" ]; then npm run dev; else npm start; fi"]
