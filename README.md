# Araam - Ad Hijack Blocker

![Araam Logo](icon128.svg)

**Blocks annoying ad popups, new tabs, and redirects — but ONLY on websites you choose. Disabled everywhere by default.**

## Features

🛡️ **Selective Protection** - Enable protection only on sites you trust  
❌ **Block Window.open** - Prevents scripts from opening new tabs and popups  
🚫 **Block Cross-Origin Redirects** - Stops sneaky redirects to external sites  
🔗 **Force Same-Tab Links** - Converts `target="_blank"` links to open in the same tab  
📄 **Block Meta Refresh** - Prevents auto-redirects via meta tags  
⚡ **Lightweight** - Minimal performance impact  

## How to Use

1. **Install** the extension in Chrome
2. **Visit a website** where you want to block ad hijacking
3. **Click the Araam icon** in your toolbar
4. **Click "Enable on this site"** to activate protection
5. The domain and all subdomains are now protected

### Managing Protected Sites

- Open the popup to see all **Protected websites**
- Click **Remove** to disable protection on any site
- **"Reload current tab"** button helps apply changes immediately

## How It Works

Araam runs a content script on whitelisted domains that:

1. **Intercepts `window.open()`** - Returns `null` instead of opening a new window
2. **Blocks `location.assign()` and `location.replace()`** - Prevents cross-origin redirects via JavaScript
3. **Removes malicious `target="_blank"`** - Forces links to open in the current tab
4. **Strips meta refresh tags** - Blocks HTML-based auto-redirects
5. **Monitors dynamic content** - Re-applies protections as the page updates

## Technical Details

- **Type:** Manifest V3 Chrome Extension
- **Permissions:** `storage`, `tabs`, `activeTab`
- **Host Access:** All URLs (only active on whitelisted sites)
- **Storage:** Chrome Sync (protected domains sync across devices)
- **Content Security:** Runs in isolated context; cannot be bypassed by websites

## Installation (Development)

```bash
git clone <your-repo-url>
cd araam
```

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `araam` directory

## Files

- `manifest.json` - Extension configuration
- `popup.html/js` - User interface for managing protections
- `background.js` - Service worker for event handling
- `content.js` - Active content blocker script
- `icon16.svg`, `icon48.svg`, `icon128.svg` - Extension icons

## Privacy

✅ All data stays on your device  
✅ Protected domain list syncs securely via Chrome Sync  
✅ No tracking or telemetry  
✅ No remote calls or API usage  

## License

MIT
