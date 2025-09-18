# Mobile App Skeleton

A complete cross-platform mobile app skeleton built with React Native (Expo) and Node.js backend, designed for rapid white-label app development with full authentication and user management.

## 🚀 Features

### ✅ **Completed Features**
- **User Authentication System**
  - User registration with email verification
  - Secure login/logout with JWT tokens
  - Password strength validation
  - Email verification flow
  
- **User Profile Management**
  - View and edit user profile information
  - Change password with current password verification
  - Account deletion with confirmation
  - Premium status indicators
  
- **Settings Management**
  - App preferences (notifications, dark mode, auto sync)
  - Account security settings
  - Logout functionality with token cleanup
  
- **Backend API**
  - RESTful API with Express.js
  - JWT-based authentication
  - Database integration with Prisma ORM
  - Email service integration
  - Comprehensive error handling
  
- **Mobile App**
  - Cross-platform (iOS, Android, Web)
  - React Native with Expo
  - Secure token storage with AsyncStorage
  - Form validation with react-hook-form
  - Material Design UI with react-native-paper

### 🔄 **Ready for Extension**
- Premium subscription system
- Advertisement integration
- Push notifications
- Social media authentication
- Advanced user roles and permissions

## 📁 Project Structure

```
mobile-skeleton-app/
├── backend/                 # Node.js Express API
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Auth & validation middleware
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Utility functions
│   │   └── generated/       # Prisma generated client
│   ├── prisma/              # Database schema & migrations
│   └── __tests__/           # Backend tests
├── mobile-app/              # React Native Expo app
│   ├── app/                 # App screens (Expo Router)
│   │   ├── auth/            # Authentication screens
│   │   └── (main)/          # Main app screens
│   └── src/
│       ├── services/        # API services & token management
│       ├── types/           # TypeScript type definitions
│       └── __tests__/       # Frontend tests
└── .kiro/                   # Kiro IDE specifications
```

## 🛠 Quick Start

### Prerequisites

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Database**: MySQL (recommended) or SQLite (default)
- **Mobile Testing**: 
  - **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))
  - Or iOS Simulator (Mac) / Android Emulator

### 🚀 Automated Setup (Recommended)

**Option 1: One-Command Setup**

```bash
# Clone and setup everything automatically
git clone https://github.com/xAleksandar/mobile-skeleton-app.git
cd mobile-skeleton-app

# For macOS/Linux:
./setup.sh

# For Windows:
setup.bat
```

This script will:
- ✅ Install all dependencies
- ✅ Setup database with sample data
- ✅ Configure network settings
- ✅ Create environment files

### 📋 Manual Setup (Alternative)

If you prefer manual setup or the automated script doesn't work:

#### 1. Clone the Repository

```bash
git clone https://github.com/xAleksandar/mobile-skeleton-app.git
cd mobile-skeleton-app
```

#### 2. Install Expo CLI

```bash
npm install -g @expo/cli
```

#### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and JWT secrets

# Set up database with sample data
npm run db:setup

# Start development server
npm run dev
```

The backend will be available at `http://localhost:3000`

#### 4. Mobile App Setup

```bash
cd mobile-app

# Install dependencies
npm install

# Update network configuration
# Edit src/config/network.ts and update CURRENT_NETWORK_IP with your local IP

# Start Expo development server
npm start
```

#### 5. Choose Your Platform

- Press `w` for **web browser** (easiest for testing)
- Press `i` for **iOS simulator** (Mac only)
- Press `a` for **Android emulator**
- Scan QR code with **Expo Go** app on your phone

### 🔧 Network Configuration

For **physical device testing**, you need to update the network IP:

1. Find your local IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig | findstr "IPv4"
   ```

2. Update `mobile-app/src/config/network.ts`:
   ```typescript
   const CURRENT_NETWORK_IP = 'YOUR_LOCAL_IP_HERE'; // e.g., '192.168.1.100'
   ```

3. Restart the mobile app

## 🧪 Testing the App

### Test Users (Seeded in Development)
- **Regular User**: `test@example.com` / `testpassword123`
- **Premium User**: `premium@example.com` / `testpassword123`

### Test Flow
1. **Register** a new account or use test credentials
2. **Login** to access the main app
3. **Profile Screen**: View and edit your profile information
4. **Settings Screen**: Manage app preferences and account settings
5. **Test Features**: Change password, update profile, logout

## 🔧 Development

### Backend Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run tests
npm run db:setup     # Set up database with migrations and seed data
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data
```

### Mobile App Scripts
```bash
npm start            # Start Expo development server
npm run android      # Start on Android
npm run ios          # Start on iOS
npm run web          # Start on web
npm test             # Run tests
npm run type-check   # Run TypeScript type checking
```

## 🏗 Architecture

### Backend Stack
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM with MySQL/SQLite
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **nodemailer** - Email services
- **Jest** - Testing framework

### Mobile App Stack
- **React Native** - Mobile framework
- **Expo** - Development platform and tooling
- **TypeScript** - Type safety
- **Expo Router** - File-based navigation
- **React Native Paper** - Material Design components
- **AsyncStorage** - Secure local storage
- **React Hook Form** - Form validation
- **Jest** - Testing framework

### Database Schema
- **Users** - User accounts with authentication
- **Sessions** - JWT refresh token management
- **Payments** - Premium subscription tracking
- **AppConfig** - Application configuration

## 🔐 Security Features

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** with bcrypt
- **Email Verification** for new accounts
- **Secure Token Storage** with AsyncStorage
- **Input Validation** on both frontend and backend
- **CORS Protection** and security headers
- **Environment Variable** protection

## 📱 Supported Platforms

- **iOS** (via Expo)
- **Android** (via Expo)
- **Web** (via Expo Web)

## 🔧 Troubleshooting

### Common Issues

#### Backend Issues

**Database Connection Failed**
```bash
# Check if MySQL is running (if using MySQL)
# For SQLite, ensure the database file is created
npm run db:setup
```

**Port 3000 Already in Use**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000   # Windows (then kill the PID)
```

**Prisma Client Issues**
```bash
cd backend
npm run db:generate  # Regenerate Prisma client
```

#### Mobile App Issues

**Metro Bundler Issues**
```bash
cd mobile-app
npx expo start --clear  # Clear cache and restart
```

**Network Connection Failed**
- Ensure backend is running on `http://localhost:3000`
- For physical devices, update `CURRENT_NETWORK_IP` in `mobile-app/src/config/network.ts`
- Ensure your device and computer are on the same WiFi network

**Expo Go App Not Loading**
- Make sure Expo Go app is updated to the latest version
- Try restarting the Expo development server
- Check if your firewall is blocking the connection

#### Database Issues

**Reset Database**
```bash
cd backend
npm run db:migrate:reset  # This will reset and reseed the database
```

**View Database**
```bash
cd backend
npm run db:studio  # Opens Prisma Studio in browser
```

### Getting Help

1. Check the [Issues](https://github.com/xAleksandar/mobile-skeleton-app/issues) page
2. Create a new issue with:
   - Your operating system
   - Node.js version (`node --version`)
   - Error messages
   - Steps to reproduce

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test` (in both backend and mobile-app)
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- UI components from [React Native Paper](https://reactnativepaper.com/)
- Database ORM by [Prisma](https://www.prisma.io/)
- Authentication with [JWT](https://jwt.io/)

---

**Ready to build your next mobile app?** This skeleton provides a solid foundation with authentication, user management, and a scalable architecture. Just customize the UI, add your business logic, and deploy! 🚀