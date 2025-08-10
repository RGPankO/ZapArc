# 🚀 Quick Setup Guide

This guide will help you get the Mobile App Skeleton up and running in minutes.

## 📋 Prerequisites

Make sure you have these installed:
- **Node.js** (v18+): [Download here](https://nodejs.org/)
- **Git**: [Download here](https://git-scm.com/)
- **Expo CLI**: `npm install -g @expo/cli`

## 🔧 Setup Steps

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

# Copy environment file
cp .env.example .env

# Edit .env file with your settings (optional for SQLite)
# For production, update JWT secrets and database URL

# Set up database and seed with test data
npm run db:setup

# Start the backend server
npm run dev
```

✅ Backend should now be running at `http://localhost:3000`

### 3. Mobile App Setup
Open a new terminal:
```bash
cd mobile-app

# Install dependencies
npm install

# Start Expo development server
npm start
```

### 4. Choose Your Platform
- Press `w` for **Web** (easiest for testing)
- Press `i` for **iOS Simulator** (Mac only)
- Press `a` for **Android Emulator**
- Scan QR code with **Expo Go** app

## 🧪 Test the App

### Login with Test Accounts
- **Regular User**: `test@example.com` / `testpassword123`
- **Premium User**: `premium@example.com` / `testpassword123`

### Or Register a New Account
1. Go to Registration screen
2. Fill in your details
3. Check console for verification token (email service not configured by default)

## 🎯 What to Test

1. **Authentication Flow**
   - Register new account
   - Login/logout
   - Email verification

2. **Profile Management**
   - View profile information
   - Edit profile details
   - Change password

3. **Settings**
   - Toggle app preferences
   - Account management
   - Logout functionality

## 🔧 Configuration

### Database Options
- **SQLite** (default): No setup required, uses `dev.db` file
- **MySQL**: Update `DATABASE_URL` in `.env` to your MySQL connection string

### Email Service
To enable email verification:
1. Update email settings in `backend/.env`
2. Use Gmail with app password or your SMTP provider

### JWT Secrets
For production, generate secure JWT secrets:
```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🚨 Troubleshooting

### Backend Issues
- **Database connection error**: Check your `DATABASE_URL` in `.env`
- **Port already in use**: Change `PORT` in `.env` or kill process on port 3000

### Mobile App Issues
- **Metro bundler issues**: Clear cache with `npx expo start --clear`
- **Network errors**: Make sure backend is running on `http://localhost:3000`

### Common Solutions
```bash
# Clear all caches
cd backend && rm -rf node_modules && npm install
cd mobile-app && rm -rf node_modules && npm install
npx expo start --clear
```

## 📚 Next Steps

1. **Customize the UI**: Update colors, fonts, and branding in the mobile app
2. **Add Features**: Extend the API and add new screens
3. **Deploy**: Set up production database and deploy to your preferred platform
4. **Configure Email**: Set up proper email service for production

## 🆘 Need Help?

- Check the main [README.md](README.md) for detailed documentation
- Review the API documentation in `backend/AUTHENTICATION.md`
- Look at the database schema in `backend/prisma/schema.prisma`

Happy coding! 🎉