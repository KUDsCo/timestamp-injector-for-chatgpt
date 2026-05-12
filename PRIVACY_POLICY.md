# Privacy Policy

**Effective Date:** 2026-05-12

This Privacy Policy explains how the "ChatGPT Timestamp Injector" browser extension handles your information.

## Data Collection and Usage

The "ChatGPT Timestamp Injector" extension operates entirely locally within your browser. 

1.  **No External Data Collection:** The extension does not collect, transmit, distribute, or sell your personal data or your ChatGPT conversation history to the developer or any third parties.
2.  **Local Processing:** To function, the extension interacts with the ChatGPT webpage you are actively viewing. It reads the local conversation data provided by the ChatGPT interface solely for the purpose of extracting the creation time of each message and displaying it on your screen.
3.  **Local Storage:** Your preferences for timestamp appearance (such as color, font size, and format) are saved locally in your browser using the standard extension storage API (`chrome.storage.sync`). This data is synced across your devices only if you have enabled browser sync features; the developer has no access to this data.

## Permissions

The extension requires the following permissions to function:

*   **`storage`**: Used exclusively to save and load your visual preferences for the timestamps.
*   **Host Permissions (`https://chatgpt.com/*`)**: Required to inject the script into the ChatGPT webpage so it can read message times and modify the page to display the timestamps.

## Contact

If you have any questions or concerns about this Privacy Policy, please open an issue in the project's repository.