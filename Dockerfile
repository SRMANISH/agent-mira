FROM node:18

# Install Python and pip
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv

# Set working directory
WORKDIR /app

# Copy everything
COPY . .

# Install Node dependencies
WORKDIR /app/server
RUN npm install

# Install Python dependencies (bypass Debian restriction)
RUN pip3 install --break-system-packages -r requirements.txt

# Start server
CMD ["node", "server.js"]
