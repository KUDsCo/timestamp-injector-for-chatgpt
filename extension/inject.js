(function() {
    'use strict';

    let settings = {
        enabled: true,
        textColor: '#888888',
        fontSize: '0.875rem',
        dateFormat: 'YYYY/MM/DD HH:mm:ss'
    };

    // Load settings from DOM attribute
    function loadSettingsFromDOM() {
        if (!document.body) return false;
        const attr = document.body.getAttribute('data-chatgpt-timestamp-settings');
        if (!attr) return false;
        
        try {
            const parsed = JSON.parse(attr);
            // Check if settings actually changed
            const hasChanged = JSON.stringify(settings) !== JSON.stringify(parsed);
            if (hasChanged) {
                settings = parsed;
                return true;
            }
        } catch (err) {
            console.error("Failed to parse settings from DOM:", err);
        }
        return false;
    }

    function applySettingsToAllTimestamps() {
        const timestamps = document.querySelectorAll('time.chatgpt-timestamp');
        
        if (!settings.enabled) {
            timestamps.forEach(el => el.style.display = 'none');
            return;
        }

        timestamps.forEach(timeEl => {
            timeEl.style.display = 'block';
            timeEl.style.color = settings.textColor;
            timeEl.style.fontSize = settings.fontSize;
            
            const timestamp = parseInt(timeEl.getAttribute('data-timestamp'), 10);
            if (!isNaN(timestamp)) {
                timeEl.textContent = formatTimestamp(new Date(timestamp * 1000));
            }
        });
    }

    /** フォーマット済み日時文字列を取得する関数 */
    function formatTimestamp(date) {
        const pad = (n) => n.toString().padStart(2, '0');
        const YYYY = date.getFullYear();
        const M = date.getMonth() + 1;
        const D = date.getDate();
        const HH = pad(date.getHours());
        const mm = pad(date.getMinutes());
        const ss = pad(date.getSeconds());
        
        const formatStr = settings.dateFormat;
        
        return formatStr
            .replace('YYYY', YYYY)
            .replace('MM', pad(M))
            .replace('DD', pad(D))
            .replace('HH', HH)
            .replace('mm', mm)
            .replace('ss', ss);
    }

    // Cache for local timestamps assigned to newly generated messages
    const localTimestampMap = new Map();
    // Keep track of when we consider the page initially loaded to distinguish between existing vs new messages
    let initialLoadComplete = false;

    /** React Fiberツリーからメッセージの生成時刻（create_time）を抽出する関数 */
    function extractTimeFromReactFiber(element) {
        if (!element) return null;
        
        // Find the React Fiber node key
        const reactKey = Object.keys(element).find(key => key.startsWith('__reactFiber$'));
        if (!reactKey) return null;

        let node = element[reactKey];
        // Walk up the tree to find memoizedProps.messages
        for (let i = 0; i < 20 && node; i++) {
            const messages = node.memoizedProps?.messages;
            if (messages && messages.length > 0 && messages[0].create_time) {
                return messages[0].create_time;
            }
            node = node.return;
        }
        
        return null;
    }

    /** メッセージ要素にタイムスタンプを付与する関数 */
    function appendTimestampElement(messageElem, timestamp) {
        if (messageElem.querySelector('time.chatgpt-timestamp')) return;

        const date = new Date(timestamp * 1000);
        const timeText = formatTimestamp(date);
        const timeEl = document.createElement('time');
        timeEl.className = 'chatgpt-timestamp w-full';
        timeEl.dateTime = date.toISOString();
        timeEl.title = date.toLocaleString();
        timeEl.textContent = timeText;
        timeEl.setAttribute('data-timestamp', timestamp);

        const role = messageElem.getAttribute('data-message-author-role');
        Object.assign(timeEl.style, {
            fontStyle: 'italic',
            opacity: '0.8',
            fontSize: settings.fontSize,
            color: settings.textColor,
            display: settings.enabled ? 'block' : 'none',
            textAlign: role === 'user' ? 'right' : 'left',
            marginTop: '4px'
        });
        
        messageElem.appendChild(timeEl);
    }

    const processedIds = new Set();
    
    // Process a specific message instantly
    function processMessageTimestamp(messageId, element) {
        if (element.querySelector('time.chatgpt-timestamp')) return;

        let timestampToUse = null;

        // Try getting local time if already assigned
        if (localTimestampMap.has(messageId)) {
            timestampToUse = localTimestampMap.get(messageId);
        } else {
            // Try extracting exact time from React Fiber
            const reactTime = extractTimeFromReactFiber(element);
            
            if (reactTime) {
                timestampToUse = reactTime;
            } else if (initialLoadComplete) {
                // If React doesn't have it yet and it's a new message (initial load is done), use local time immediately
                timestampToUse = Date.now() / 1000;
                localTimestampMap.set(messageId, timestampToUse);
            }
        }

        if (timestampToUse !== null) {
            appendTimestampElement(element, timestampToUse);
            processedIds.add(messageId);
        }
    }

    // Process all missing timestamps immediately
    function processAllMissing() {
        const elements = Array.from(document.querySelectorAll('[data-message-id]'));
        
        // Reverse array to process from bottom (newest) to top
        elements.reverse().forEach(el => {
            const id = el.getAttribute('data-message-id');
            if (id && !el.querySelector('time.chatgpt-timestamp')) {
                processMessageTimestamp(id, el);
            }
        });
    }

    // Debounce just the loop to avoid calling querySelectorAll too much on stream updates,
    // but the debounce is very short (50ms) to ensure near instant rendering
    let processAllTimer = null;
    function triggerImmediateProcess() {
        if (processAllTimer) clearTimeout(processAllTimer);
        processAllTimer = setTimeout(() => {
            processAllMissing();
        }, 50);
    }

    // An observer that triggers processing anytime relevant nodes appear or update
    const observer = new MutationObserver((mutations) => {
        let shouldCheckMessages = false;
        let shouldUpdateSettings = false;

        for (const mut of mutations) {
            // Check if settings attribute on body changed
            if (mut.target === document.body && mut.attributeName === 'data-chatgpt-timestamp-settings') {
                shouldUpdateSettings = true;
            }

            if (mut.type === 'childList' && mut.addedNodes.length > 0) {
                shouldCheckMessages = true;
            }
            // For streaming updates (re-renders might remove the time element)
            if (mut.type === 'characterData' || mut.type === 'childList') {
                let targetNode = mut.target;
                if (targetNode.nodeType !== 1) targetNode = targetNode.parentElement;
                if (targetNode && targetNode.closest('[data-message-id]')) {
                    shouldCheckMessages = true;
                }
            }
        }

        if (shouldUpdateSettings) {
            if (loadSettingsFromDOM()) {
                applySettingsToAllTimestamps();
            }
        }

        if (shouldCheckMessages) {
            triggerImmediateProcess();
        }
    });

    function startObserving() {
        const main = document.querySelector('main') || document.body;
        if (main && document.body) {
            // Load initial settings
            loadSettingsFromDOM();

            // Observe body for settings changes
            observer.observe(document.body, { attributes: true, attributeFilter: ['data-chatgpt-timestamp-settings'] });
            // Observe main for message updates
            observer.observe(main, { childList: true, subtree: true, characterData: true });
            
            // Set initial load flag after a delay to distinguish between existing vs new messages
            setTimeout(() => {
                initialLoadComplete = true;
            }, 3000);
            
            triggerImmediateProcess();
        } else {
            setTimeout(startObserving, 1000);
        }
    }
    startObserving();

    // Monitor URL changes
    let currentPath = location.pathname;
    setInterval(() => {
        if (location.pathname !== currentPath) {
            currentPath = location.pathname;
            processedIds.clear();
            initialLoadComplete = false;
            
            setTimeout(() => {
                initialLoadComplete = true;
            }, 3000);

            triggerImmediateProcess();
        }
    }, 1000);
})();