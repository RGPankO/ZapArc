# 🚀 Quick Start Guide

Get up and running in 5 minutes!

## 1. Prerequisites Check

Make sure you have:
- ✅ **Node.js 18+** installed ([Download](https://nodejs.org/))
- ✅ **Git** installed
- ✅ **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

## 2. One-Command Setup

```bash
# Clone the repository
git clone https://github.com/xAleksandar/mobile-skeleton-app.git
cd mobile-skeleton-app

# Run automated setup
./setup.sh        # macOS/Linux
# OR
setup.bat         # Windows
```

## 3. Start Development

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Mobile App:**
```bash
cd mobile-app
npm start
```

## 4. Test the App

1. **Web Browser** (easiest): Press `w` in the Expo CLI
2. **Phone**: Scan QR code with Expo Go app
3. **Simulator**: Press `i` (iOS) or `a` (Android)

## 5. Login & Test

Use these test credentials:
- **Email**: `test@example.com`
- **Password**: `testpassword123`

Or register a new account!

## 🎉 You're Ready!

The app includes:
- ✅ User registration & login
- ✅ Profile management
- ✅ Settings screen
- ✅ JWT authentication
- ✅ Database with sample data

## 📱 What to Try

1. **Register** a new account
2. **Login** with test credentials
3. **Edit your profile** information
4. **Change password** in settings
5. **Logout** and login again

## 🔧 Need Help?

- **Backend not starting?** Check if port 3000 is free
- **Mobile app not connecting?** Update your IP in `mobile-app/src/config/network.ts`
- **Database issues?** Run `cd backend && npm run db:setup`

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check out the [project structure](README.md#-project-structure)
- Explore the [API endpoints](backend/README.md)
- Customize the UI and add your features!

---

**Happy coding!** 🚀 You now have a complete mobile app foundation ready for customization.