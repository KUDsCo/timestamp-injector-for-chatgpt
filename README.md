# Timestamp Injector for ChatGPT

質問と回答の下に、それぞれの作成日時を選んだ形式で常時表示します。ブラウザーのページ内検索（⌘F / Ctrl+F）で、現在読み込まれている発言を日時から探せます。日時が取得できない発言は空欄になります。

## Features

- **Automatic Injection**: Timestamps appear when ChatGPT provides a creation time for the displayed user or assistant message.
- **Customizable**: Click the extension icon to customize the appearance of the timestamps:
  - **Color**: Choose any color for the timestamp text.
  - **Font Size**: Select between Small, Medium, and Large.
  - **Format**: Choose how the date and time are displayed (e.g., full date and time, short date, or just time).
- **Seamless Integration**: Matches the native look and feel of ChatGPT.
- **Cross-Browser Support**: Works on Chrome, Edge, and Firefox.

*Note for Firefox users: Due to a long-standing Firefox extension bug regarding native color pickers in popups, the custom color picker is disabled on Firefox. Only the preset colors are available.*

## Installation

### From the store

- **Chrome**: [Chrome Web Store](https://chromewebstore.google.com/detail/timestamp-injector-for-ch/bncpfipegbkcpaendbpopechcolaofch)
- **Firefox**: [Firefox Add-ons (AMO)](https://addons.mozilla.org/en-US/firefox/addon/timestamp-injector-for-chatgpt/)
- **Edge**: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/timestamp-injector-for-ch/lamgpjbmjhdgkbaodahkmggfbgigmbmk)

### From source (unpacked)

1. Clone or download this repository.
2. Open your browser's extension management page (e.g., `chrome://extensions/` or `about:debugging`).
3. Enable "Developer mode".
4. Click "Load unpacked" and select the `extension` directory from this project.

## Privacy

This extension runs locally in your browser. It only interacts with the ChatGPT webpage to retrieve and display message times. It does not send your data to any external servers. See the [Privacy Policy](PRIVACY_POLICY.md) for more details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
