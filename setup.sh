#!/bin/bash

# Mobile App Skeleton - Complete Setup Script
# This script sets up both backend and mobile app for development

set -e  # Exit on any error

echo "🚀 Mobile App Skeleton - Complete Setup"
echo "======================================"
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
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_success "Node.js $(node -v) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    print_success "npm $(npm -v) is installed"
}

# Install Expo CLI globally if not present
install_expo_cli() {
    if ! command -v expo &> /dev/null; then
        print_status "Installing Expo CLI globally..."
        npm install -g @expo/cli
        print_success "Expo CLI installed"
    else
        print_success "Expo CLI is already installed"
    fi
}

# Setup backend
setup_backend() {
    print_status "Setting up backend..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    print_success "Backend dependencies installed"
    
    # Setup environment file
    if [ ! -f .env ]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        print_warning "Please edit backend/.env file with your database credentials and JWT secrets"
        print_warning "Default SQLite database will be used if no MySQL connection is configured"
    else
        print_success ".env file already exists"
    fi
    
    # Setup database
    print_status "Setting up database..."
    npm run db:setup
    print_success "Database setup completed"
    
    cd ..
}

# Setup mobile app
setup_mobile_app() {
    print_status "Setting up mobile app..."
    
    cd mobile-app
    
    # Install dependencies
    print_status "Installing mobile app dependencies..."
    npm install
    print_success "Mobile app dependencies installed"
    
    # Update network configuration
    print_status "Configuring network settings..."
    
    # Get local IP address
    if command -v ipconfig &> /dev/null; then
        # Windows
        LOCAL_IP=$(ipconfig | grep -o "IPv4 Address[^:]*: [0-9.]*" | grep -o "[0-9.]*$" | head -1)
    elif command -v ifconfig &> /dev/null; then
        # macOS/Linux
        LOCAL_IP=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -1)
    else
        LOCAL_IP="192.168.1.100"
        print_warning "Could not detect local IP. Using default: $LOCAL_IP"
    fi
    
    if [ ! -z "$LOCAL_IP" ]; then
        print_status "Detected local IP: $LOCAL_IP"
        print_status "Updating network configuration..."
        
        # Update the network config file
        sed -i.bak "s/const CURRENT_NETWORK_IP = '[^']*'/const CURRENT_NETWORK_IP = '$LOCAL_IP'/" src/config/network.ts
        rm -f src/config/network.ts.bak
        
        print_success "Network configuration updated with IP: $LOCAL_IP"
    else
        print_warning "Could not detect local IP. Please manually update mobile-app/src/config/network.ts"
    fi
    
    cd ..
}

# Main setup function
main() {
    print_status "Starting complete setup process..."
    echo ""
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    check_node
    check_npm
    install_expo_cli
    echo ""
    
    # Setup backend
    setup_backend
    echo ""
    
    # Setup mobile app
    setup_mobile_app
    echo ""
    
    # Final instructions
    print_success "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "=============="
    echo ""
    echo "1. 📝 Configure Backend:"
    echo "   - Edit backend/.env with your database credentials"
    echo "   - For MySQL: Update DATABASE_URL"
    echo "   - For SQLite: Default configuration is ready"
    echo ""
    echo "2. 🚀 Start Backend Server:"
    echo "   cd backend"
    echo "   npm run dev"
    echo ""
    echo "3. 📱 Start Mobile App (in new terminal):"
    echo "   cd mobile-app"
    echo "   npm start"
    echo ""
    echo "4. 🧪 Test the App:"
    echo "   - Use test credentials: test@example.com / testpassword123"
    echo "   - Or register a new account"
    echo ""
    echo "5. 🌐 Access Options:"
    echo "   - Web: Press 'w' in Expo CLI"
    echo "   - iOS Simulator: Press 'i' (Mac only)"
    echo "   - Android Emulator: Press 'a'"
    echo "   - Physical Device: Scan QR code with Expo Go app"
    echo ""
    print_success "Happy coding! 🚀"
}

# Run main function
main