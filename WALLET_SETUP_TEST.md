# Wallet Setup Test Guide

## 🔧 **Fixed Issues**

1. **Added wallet existence check** - Now properly detects if a wallet has been set up
2. **Fixed popup flow** - Shows "Setup Wallet" button when no wallet exists
3. **Improved UI** - Better styling and clearer messaging
4. **Added reconnect flow** - Handles wallet disconnection gracefully

## 🧪 **Test the Fixed Wallet Setup**

### **Step 1: Fresh Start**
1. **Clear extension storage** (if needed):
   - Go to `chrome://extensions/`
   - Find "Lightning Tipping Extension"
   - Click "Details" → "Extension options" → "Clear storage" (if available)
   - Or manually clear via Developer Tools → Application → Storage

### **Step 2: Test Wallet Setup Flow**
1. **Click the extension icon**
2. **You should now see**:
   ```
   ⚡ Lightning Tipping
   Wallet Setup Required
   Initialize your Lightning wallet to get started.
   [Setup Wallet] [Skip Setup]
   ```

3. **Click "Setup Wallet"**
4. **Enter a PIN** (6+ characters) when prompted
5. **Wallet should initialize** and show the main interface:
   ```
   Lightning Tipping
   -- sats
   [Deposit] [Withdraw]
   [Settings]
   ```

### **Step 3: Test Wallet Lock/Unlock**
1. **Close the popup** and reopen it
2. **Should show unlock prompt**:
   ```
   ⚡ Lightning Tipping
   Wallet Locked
   Enter your PIN to unlock the wallet.
   [PIN Input Field]
   [Unlock]
   ```

3. **Enter your PIN** and click "Unlock"
4. **Should return to main interface**

### **Step 4: Test Tip Detection**
1. **Open test.html** in a browser tab
2. **You should see a tip prompt** appear near the tip text
3. **Click "📱 Show QR"** - QR modal should open
4. **Try clicking an amount** - Should show payment confirmation

## 🎯 **What Should Work Now**

### ✅ **Wallet Management**
- ✅ First-time wallet setup with PIN
- ✅ Wallet lock/unlock functionality  
- ✅ Proper state detection (no wallet vs locked vs unlocked)
- ✅ Balance display (will be 0 initially)
- ✅ Deposit invoice generation
- ✅ Withdrawal via bolt11 invoices

### ✅ **Tip Processing**
- ✅ Automatic tip detection on any webpage
- ✅ Enhanced tip prompts with 6 amount buttons
- ✅ QR code generation for external wallets
- ✅ Payment confirmation dialogs
- ✅ Error handling with retry mechanisms

### ✅ **User Experience**
- ✅ Clear setup flow for new users
- ✅ Proper unlock flow for returning users
- ✅ Reconnection handling for disconnected wallets
- ✅ Skip option for users who only want QR codes

## 🚨 **If You Still See Issues**

### **Problem: Still shows "Wallet Locked" immediately**
**Solution**: Clear extension storage and try again:
1. Open Developer Tools (F12)
2. Go to Application → Storage → Local Storage
3. Find the extension's storage and clear it
4. Reload the extension

### **Problem: Setup button doesn't appear**
**Solution**: Check browser console for errors:
1. Right-click extension popup → "Inspect"
2. Check Console tab for error messages
3. Ensure all files are properly built/loaded

### **Problem: PIN doesn't work**
**Solution**: 
1. Make sure PIN is 6+ characters
2. Check console for encryption errors
3. Try clearing storage and setting up again

## 🎉 **Success Indicators**

You'll know it's working when:
1. **Fresh install** → Shows "Setup Wallet" button
2. **After setup** → Shows balance and wallet controls
3. **After closing/reopening** → Shows unlock prompt
4. **After unlocking** → Returns to main interface
5. **On test.html** → Tip prompt appears automatically
6. **QR generation** → Works for external wallets
7. **Payment flow** → Shows confirmation dialogs

The wallet setup flow should now work properly! 🚀