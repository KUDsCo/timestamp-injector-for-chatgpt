# Timestamp Injector for ChatGPT — Deprecated

この拡張機能はメンテナンスを終了しました。ChatGPT の Web 版では、過去の会話を開くと会話の区切りに日時が表示されます。個別の回答の日時は、その回答の下にある「…」（More actions）から確認できます。確認した公式表示の精度は分単位です。

拡張機能の最終版は 1.0.0 です。現在の Web 版では発言を特定する画面要素が変わったため、この版のタイムスタンプが表示されない場合があります。以下は最終版の機能と配布先の記録です。

A browser extension that automatically injects customizable timestamps into ChatGPT conversations. It displays the exact time each message was sent or received, directly below the message bubble.

## Features

- **Automatic Injection**: Timestamps are automatically added to all messages (user and AI) in a ChatGPT conversation.
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
