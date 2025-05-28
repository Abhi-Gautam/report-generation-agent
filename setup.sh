#!/bin/bash

# Research Agent Installation Script
# This script handles dependency conflicts and sets up the project

set -e

echo "🚀 Setting up Research Agent project..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js $(node -v) detected"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_warning "Docker is not installed. You'll need Docker for the full setup."
else
    print_success "Docker $(docker --version | cut -d' ' -f3 | cut -d',' -f1) detected"
fi

# Setup environment file
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your API keys before continuing"
    print_status "Required API keys:"
    echo "  - GEMINI_API_KEY (Google AI Studio)"
    echo "  - BRAVE_SEARCH_API_KEY (Brave Search API)"
    echo "  - Generate JWT_SECRET and ENCRYPTION_KEY using:"
    echo "    node -e \"console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))\""
    echo "    node -e \"console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(16).toString('hex'))\""
    echo ""
else
    print_success ".env file already exists"
fi

# Install shared dependencies first
print_status "Installing shared dependencies..."
cd shared
npm install --legacy-peer-deps
cd ..

# Install backend dependencies with conflict resolution
print_status "Installing backend dependencies..."
cd backend

# Remove existing node_modules and package-lock.json to start fresh
rm -rf node_modules package-lock.json

# Install with legacy peer deps to resolve conflicts
npm install --legacy-peer-deps --no-audit --no-fund

# Build backend to generate dist directory
npm run build

print_success "Backend dependencies installed"
cd ..

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend

# Remove existing node_modules and package-lock.json to start fresh
rm -rf node_modules package-lock.json

# Install frontend dependencies
npm install --legacy-peer-deps --no-audit --no-fund

print_success "Frontend dependencies installed"
cd ..

# Generate Prisma client
print_status "Generating Prisma client..."
cd backend
npx prisma generate
cd ..

print_success "Setup completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Start with Docker: docker-compose up -d"
echo "3. Or start locally:"
echo "   - Backend: cd backend && npm run dev"
echo "   - Frontend: cd frontend && npm run dev"
echo ""
print_status "Access the application:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:4000"
echo "- Health Check: http://localhost:4000/api/health"
