#!/bin/bash
# Oracle Keeper Deployment Script

set -e  # Exit on any error

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}RedStone Oracle Keeper Deployment${NC}"
echo "=================================="

# Check if .env.production exists
if [ ! -f .env.production ]; then
  echo -e "${RED}Error: .env.production file not found!${NC}"
  echo "Please create .env.production first using the .env.example template."
  exit 1
fi

# Copy .env.production to .env
echo -e "${YELLOW}Setting up environment...${NC}"
cp .env.production .env
echo "✅ Environment configured"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker is not installed!${NC}"
  echo "Please install Docker and Docker Compose before proceeding."
  exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo -e "${RED}Error: Docker Compose is not installed!${NC}"
  echo "Please install Docker Compose before proceeding."
  exit 1
fi

# Create logs directory if it doesn't exist
echo -e "${YELLOW}Creating logs directory...${NC}"
mkdir -p logs
echo "✅ Logs directory created"

# Build and start the containers
echo -e "${YELLOW}Building and starting containers...${NC}"
docker-compose up -d --build
echo "✅ Containers started"

# Check if the service is running
echo -e "${YELLOW}Checking service health...${NC}"
sleep 5  # Wait for the service to start

if curl -s http://localhost:3002/health > /dev/null; then
  echo -e "${GREEN}✅ Oracle Keeper is running and healthy!${NC}"
  echo -e "Health check endpoint: ${YELLOW}http://localhost:3002/health${NC}"
  echo -e "Prices endpoint: ${YELLOW}http://localhost:3002/prices${NC}"
else
  echo -e "${RED}❌ Oracle Keeper is not responding to health checks${NC}"
  echo "Check the logs with: docker-compose logs oracle-keeper"
fi

echo -e "\n${GREEN}Deployment completed!${NC}"
echo "To view logs: docker-compose logs -f oracle-keeper"
echo "To stop the service: docker-compose down"
