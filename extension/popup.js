document.addEventListener('DOMContentLoaded', () => {
  const colorInput = document.getElementById('color');
  const fontSizeSelect = document.getElementById('fontSize');
  const formatSelect = document.getElementById('format');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  chrome.storage.sync.get({
    color: '#888888',
    fontSize: '0.875rem',
    format: 'default'
  }, (items) => {
    colorInput.value = items.color;
    fontSizeSelect.value = items.fontSize;
    formatSelect.value = items.format;
  });

  // Save settings on change
  const saveSettings = () => {
    chrome.storage.sync.set({
      color: colorInput.value,
      fontSize: fontSizeSelect.value,
      format: formatSelect.value
    }, () => {
      statusDiv.textContent = 'Settings saved!';
      setTimeout(() => {
        statusDiv.textContent = '';
      }, 2000);
      
      // Notify content script about the change
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && tabs[0].url && tabs[0].url.includes('chatgpt.com')) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'updateSettings' }).catch(() => {
            // Ignore errors if content script is not injected yet
          });
        }
      });
    });
  };

  colorInput.addEventListener('change', saveSettings);
  fontSizeSelect.addEventListener('change', saveSettings);
  formatSelect.addEventListener('change', saveSettings);
});