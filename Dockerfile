# Use Node.js base image
FROM node:18

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip

# Set working directory
WORKDIR /app

# Copy all files
COPY . .

# Install Node dependencies
WORKDIR /app/server
RUN npm install

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Set default command
CMD ["node", "server.js"]
