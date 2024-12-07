FROM node:18-slim

# Install required dependencies and cleanup in a single layer
RUN apt-get update && \
    apt-get install -y \
    graphicsmagick \
    ghostscript \
    imagemagick \
    libmagickwand-dev \
    libgs-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    ln -s /usr/bin/gm /usr/local/bin/gm

# Configure ImageMagick policy to allow PDF processing
COPY --chmod=644 policy.xml /etc/ImageMagick-6/policy.xml

# Create and set permissions for temp directory
RUN mkdir -p /tmp/pdf-converter && \
    chmod 777 /tmp/pdf-converter

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . ./

# Verify installations
RUN gm version && convert -version

EXPOSE 3000

CMD ["npm", "start"]