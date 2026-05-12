// content.js
// Content script to bridge extension storage (settings) and the injected script

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
  color: '#888888',
  fontSize: '0.875rem',
  format: 'default'
};

// Send settings to the injected script via a custom event
const updateInjectedSettings = () => {
  window.dispatchEvent(new CustomEvent('ChatGPTTimestampSettingsUpdate', {
    detail: currentSettings
  }));
};

// Load initial settings and inject the script
chrome.storage.sync.get(currentSettings, (items) => {
  currentSettings = items;
  // Inject the script into the page context
  injectScript('inject.js');
  
  // Send initial settings a bit after injection to ensure the script has loaded
  setTimeout(updateInjectedSettings, 500);
});

// Listen for settings changes from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateSettings') {
    chrome.storage.sync.get(currentSettings, (items) => {
      currentSettings = items;
      updateInjectedSettings();
    });
  }
});