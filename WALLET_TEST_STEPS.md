# 🧪 Wallet Test Steps - Fixed Version

## 🔧 **Issue Fixed: Breez SDK DOM Error**

The error `document is not defined` was caused by the Breez SDK trying to initialize in the background service worker, which doesn't have DOM access. I've removed that initialization.

## 🚀 **Test the Fixed Extension**

### **Step 1: Reload Extension**
1. Go to `chrome://extensions/`
2. Find "Lightning Tipping Extension"
3. Click the **reload button** 🔄

### **Step 2: Clear Storage (Important!)**
1. Right-click extension icon → "Inspect popup"
2. Go to **Application** tab → **Storage** → **Local Storage**
3. Find extension storage and **clear it**
4. Close developer tools

### **Step 3: Test Wallet Setup**
1. **Click extension icon**
2. **Should show**: "⚡ Lightning Tipping - Wallet Setup Required"
3. **Click "Setup Wallet"**
4. **Enter PIN**: 6+ characters (e.g., "123456")
5. **Should complete** and show main wallet interface

### **Step 4: Verify Console Logs**
Open developer tools again and check console. You should see:
```
Background service worker ready - Breez SDK will be initialized when needed
Starting wallet setup with PIN length: 6
Background: Starting wallet setup
WalletManager: Starting basic wallet setup (no Breez SDK)
WalletManager: Got user settings
WalletManager: Wallet data encrypted and saved
WalletManager: Basic wallet setup completed successfully
```

### **Step 5: Test Lock/Unlock**
1. **Close popup** and reopen
2. **Should show**: "Wallet Locked - Enter your PIN to unlock"
3. **Enter PIN** and click "Unlock"
4. **Should return** to main wallet interface

### **Step 6: Test Tip Detection**
1. **Open test.html** in a new tab
2. **Should see** tip prompt appear automatically
3. **Click "📱 Show QR"** → QR modal should open
4. **Click an amount** → Confirmation dialog should appear

## ✅ **Expected Results**

**✅ Working:**
- Wallet setup completes successfully
- PIN-based lock/unlock works
- Tip detection on webpages
- QR code generation
- Payment confirmation dialogs

**❌ Expected to Fail (for now):**
- Actual Lightning payments (needs Breez SDK)
- Real balance updates
- LNURL operations

## 🚨 **If Still Having Issues**

**Problem: Still getting errors**
- Check browser console for specific error messages
- Try clearing ALL extension data: `chrome://settings/content/all`

**Problem: Popup still disappears**
- Make sure you cleared storage completely
- Try disabling and re-enabling the extension

**Problem: No tip prompts on test.html**
- Check if content script is loading
- Look for console errors in the webpage (not popup)

## 🎯 **Success Criteria**

You'll know it's working when:
1. ✅ No "document is not defined" errors in console
2. ✅ Wallet setup completes with success message
3. ✅ Lock/unlock cycle works properly
4. ✅ Tip prompts appear on test.html
5. ✅ QR codes generate successfully

**Try it now and let me know what happens!** 🚀