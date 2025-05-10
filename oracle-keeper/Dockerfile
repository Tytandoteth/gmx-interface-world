FROM node:18-alpine

# Create app directory
WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose port
EXPOSE 3002

# Copy production file to index.js
COPY index-production.js index.js

# Start application
CMD ["node", "index.js"]
