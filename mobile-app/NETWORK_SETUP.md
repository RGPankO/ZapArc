# Network Configuration Guide

## When Your Network IP Changes

If you change networks or your IP address changes, you only need to update **one file**:

### Update Mobile App Configuration

Edit `mobile-app/src/config/network.ts`:

```typescript
const CURRENT_NETWORK_IP = '192.168.6.199'; // Update this line with your new IP
```

### Find Your Current IP Address

**On macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```cmd
ipconfig | findstr "IPv4"
```

### Backend Configuration

The backend is configured to bind to all network interfaces (`0.0.0.0`) in development mode, so it should automatically be accessible on your new IP address.

### Email Verification Links

If you want email verification links to use a different external IP, update:
- `backend/.env` - Change `FRONTEND_URL` to your external IP

## Testing Network Connectivity

Test if the backend is accessible:

```bash
# Replace with your current IP
curl http://YOUR_IP:3000/health
```

## Deep Link Configuration

The mobile app is configured with the scheme `mobile-app://` for deep linking.

Email verification links will:
1. **Primary**: Open the mobile app directly (`mobile-app://verify-email?token=...`)
2. **Fallback**: Open in browser using your external IP

## Troubleshooting

1. **Connection Failed**: Update the IP in `network.ts`
2. **Backend Not Accessible**: Ensure backend is running with `npm run dev`
3. **Deep Links Not Working**: Check that the app scheme is properly configured in `app.json`