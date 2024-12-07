FROM node:18-slim

WORKDIR /app

# Copy policy file first
COPY policy.xml /app/policy.xml

# Install dependencies and configure system
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

COPY package*.json ./
RUN npm install

COPY . ./

# Verify installations and permissions
RUN gm version && \
    convert -version && \
    ls -l /etc/ImageMagick-6/policy.xml

EXPOSE 3000

CMD ["npm", "start"]