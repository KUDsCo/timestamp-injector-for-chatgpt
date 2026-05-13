// content.js
// Content script to bridge extension storage, API requests, and the injected script

const injectScript = (filePath) => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(filePath);
  script.type = 'text/javascript';
  script.onload = () => {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);
};

// Default settings
let currentSettings = {
    enabled: true,
    textColor: '#888888',
    fontSize: '0.875rem',
    dateFormat: 'YYYY/MM/DD HH:mm:ss'
};

// Update settings using DOM data attributes to completely bypass Firefox's CustomEvent object cloning restrictions
const updateSettingsDOM = (settingsObj) => {
    if (document.body) {
        document.body.setAttribute('data-chatgpt-timestamp-settings', JSON.stringify(settingsObj));
    }
};

// Ensure settings are applied even if body is delayed
const ensureSettingsApplied = () => {
    if (document.body) {
        updateSettingsDOM(currentSettings);
    } else {
        document.addEventListener('DOMContentLoaded', () => updateSettingsDOM(currentSettings));
    }
};

// Load initial settings and inject the script
chrome.storage.sync.get(currentSettings, (items) => {
    currentSettings = items;
    ensureSettingsApplied();
    // Inject the script into the page context
    injectScript('inject.js');
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        let hasChanges = false;
        for (let [key, { newValue }] of Object.entries(changes)) {
            if (currentSettings[key] !== newValue) {
                currentSettings[key] = newValue;
                hasChanges = true;
            }
        }
        if (hasChanges) {
            updateSettingsDOM(currentSettings);
            
            // Also apply styles directly for immediate feedback across the board
            document.querySelectorAll('time.chatgpt-timestamp').forEach(el => {
                el.style.display = currentSettings.enabled ? 'block' : 'none';
                el.style.color = currentSettings.textColor;
                el.style.fontSize = currentSettings.fontSize;
            });
        }
    }
});

// Listen for real-time preview messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'previewSetting') {
        // Fast, smooth direct DOM update without triggering full parser mutation
        if (message.type === 'textColor') {
            document.querySelectorAll('time.chatgpt-timestamp').forEach(el => {
                el.style.color = message.value;
            });
        } else if (message.type === 'fontSize') {
            document.querySelectorAll('time.chatgpt-timestamp').forEach(el => {
                el.style.fontSize = message.value;
            });
        }
    }
});
