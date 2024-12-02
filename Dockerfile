FROM node:18-slim

# Install required dependencies and cleanup in a single layer
RUN apt-get update && apt-get install -y \
        graphicsmagick \
        ghostscript \
        imagemagick \
        libmagickwand-dev \
        libgs-dev \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Configure ImageMagick policy to allow PDF processing
RUN sed -i 's/rights="none" pattern="PDF"/rights="read|write" pattern="PDF"/' /etc/ImageMagick-6/policy.xml

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Verify installations
RUN which gm && gm version && which convert && convert -version

EXPOSE 3000

CMD ["npm", "start"]