# Lightning Network Tipping Browser Extension

A Chrome extension that enables seamless Bitcoin tipping via the Lightning Network on any website, powered by Breez SDK Spark.

## Features

- **Universal Tip Detection**: Automatically detects tip requests in standardized format across all websites
- **Built-in Lightning Wallet**: Non-custodial wallet powered by Breez SDK Spark
- **Auto-Appending**: Automatically adds tip requests to posts on supported platforms
- **QR Code Support**: Generate QR codes for external wallet payments
- **Domain Management**: Control which websites can auto-append tip requests
- **Privacy-First**: All data stored locally, no external tracking

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Chrome browser for testing

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder

### Development Commands

- `npm run dev` - Build in development mode with watch
- `npm run build` - Build for production
- `npm run clean` - Clean build directory
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
├── src/
│   ├── background/          # Background service worker
│   ├── content/            # Content scripts for web pages
│   └── popup/              # Extension popup interface
├── icons/                  # Extension icons
├── dist/                   # Built extension files
├── manifest.json           # Chrome extension manifest
├── webpack.config.js       # Build configuration
└── tsconfig.json          # TypeScript configuration
```

## Architecture

The extension uses Chrome Extension Manifest V3 with:

- **Background Service Worker**: Handles Breez SDK operations and storage
- **Content Scripts**: Injected into web pages for tip detection and UI
- **Popup Interface**: Main wallet dashboard and settings
- **TypeScript**: For type safety and better development experience
- **Webpack**: For bundling and build optimization

## License

MIT License - see LICENSE file for details