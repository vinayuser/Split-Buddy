# Use official Node image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the code
COPY . .

# Expose port (inside container)
EXPOSE 3003

# Start app
CMD ["npm", "start"]
