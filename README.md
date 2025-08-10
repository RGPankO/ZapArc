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

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Expo CLI**: `npm install -g @expo/cli`
- **Database**: MySQL or SQLite

### 1. Clone the Repository

```bash
git clone git@github.com:xAleksandar/mobile-skeleton-app.git
cd mobile-skeleton-app
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and JWT secrets

# Set up database
npm run db:setup

# Start development server
npm run dev
```

The backend will be available at `http://localhost:3000`

### 3. Mobile App Setup

```bash
cd mobile-app

# Install dependencies
npm install

# Start Expo development server
npm start
```

Choose your platform:
- Press `w` for **web browser** (easiest for testing)
- Press `i` for **iOS simulator** (Mac only)
- Press `a` for **Android emulator**
- Scan QR code with **Expo Go** app on your phone

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