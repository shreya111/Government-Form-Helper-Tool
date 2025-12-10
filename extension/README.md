# Government Form Helper - Chrome Extension

AI-powered assistant for filling Indian government forms, especially the Passport Seva portal.

## Features

- **Real-time Field Detection**: Automatically detects form fields on government websites
- **Smart AI Guidance**: Intelligently decides whether to ask clarifying questions or provide direct advice
- **Interactive Questions**: For complex fields like ECR/ECNR, shows clickable options with recommendations
- **Simple Advice**: For straightforward fields like names, provides direct guidance
- **Warning Alerts**: Highlights common mistakes to avoid

## Installation

### Method 1: Load Unpacked Extension (Developer Mode)

1. **Download the extension folder** or clone this repository

2. **Open Chrome Extensions page**:
   - Type `chrome://extensions/` in your address bar
   - Or go to Menu → More Tools → Extensions

3. **Enable Developer Mode**:
   - Toggle the "Developer mode" switch in the top-right corner

4. **Load the extension**:
   - Click "Load unpacked" button
   - Select the `extension` folder containing these files

5. **Done!** The extension icon should appear in your toolbar

### Method 2: Pack as .crx file

1. On the Extensions page, click "Pack extension"
2. Select this folder as the extension root directory
3. Chrome will create a .crx file you can distribute

## Usage

1. **Navigate to Passport Seva portal**: https://services1.passportindia.gov.in/forms/PreLogin

2. **Look for "Help" buttons**: Next to each form field, you'll see a blue "Help" button

3. **Click for guidance**: Click any "Help" button to open the AI assistant panel

4. **For interactive fields** (like ECR/ECNR):
   - Answer the quick question by selecting an option
   - Get personalized recommendations

5. **For simple fields** (like Name, Address):
   - Get direct expert advice
   - See common mistakes to avoid

## Supported Websites

- services1.passportindia.gov.in (Passport Seva Portal)
- passportindia.gov.in

The extension is designed to work with legacy table-based government form layouts.

## Privacy

- The extension only activates on supported government websites
- Field labels and types are sent to our AI service for guidance
- No personal data is collected or stored

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Backend**: FastAPI + Gemini AI
- **API Endpoint**: https://formaid.preview.emergentagent.com/api

## Troubleshooting

**Help buttons not appearing?**
- Refresh the page after installing the extension
- Make sure you're on a supported website
- Check if the extension is enabled in chrome://extensions

**Panel not opening?**
- Check your browser console for errors
- Ensure the extension has permission for the website

**AI responses slow?**
- The AI service may take a few seconds to respond
- Check your internet connection

## Files

```
extension/
├── manifest.json      # Extension configuration
├── background.js      # Service worker for API calls
├── content.js         # Injected script for field detection
├── styles.css         # Panel and button styling
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```

## License

MIT License - Feel free to modify and distribute.
