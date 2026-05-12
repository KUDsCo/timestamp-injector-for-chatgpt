(function() {
    'use strict';

    let settings = {
        color: '#888888',
        fontSize: '0.875rem',
        format: 'default'
    };

    // Listen for settings updates from the content script
    window.addEventListener('ChatGPTTimestampSettingsUpdate', (e) => {
        settings = e.detail;
        // Apply settings to existing timestamps
        document.querySelectorAll('time.chatgpt-timestamp').forEach(timeEl => {
            timeEl.style.color = settings.color;
            timeEl.style.fontSize = settings.fontSize;
            // Update the text based on format
            const timestamp = parseInt(timeEl.getAttribute('data-timestamp'), 10);
            if (!isNaN(timestamp)) {
                timeEl.textContent = formatTimestamp(new Date(timestamp * 1000));
            }
        });
    });

    /** フォーマット済み日時文字列を取得する関数 */
    function formatTimestamp(date) {
        const pad = (n) => n.toString().padStart(2, '0');
        const YYYY = date.getFullYear();
        const M = date.getMonth() + 1;
        const D = date.getDate();
        const HH = pad(date.getHours());
        const mm = pad(date.getMinutes());
        const ss = pad(date.getSeconds());
        
        switch (settings.format) {
            case 'short':
                return `${pad(M)}/${pad(D)} ${HH}:${mm}`;
            case 'time':
                return `${HH}:${mm}:${ss}`;
            case 'default':
            default:
                return `${YYYY}/${M}/${D} ${HH}:${mm}:${ss}`;
        }
    }

    /** チャットIDをURLから取得する関数 */
    function getCurrentChatId() {
        const match = location.pathname.match(/^\/(?:c|g\/[^\/]+\/c)\/([^\/]+)/);
        return match ? match[1] : null;
    }

    let accessToken = null;
    /** アクセストークンを取得（既に取得済みなら再利用） */
    async function getAccessToken() {
        if (accessToken) return accessToken;
        try {
            const res = await fetch('/api/auth/session');
            if (!res.ok) throw new Error(res.statusText);
            const data = await res.json();
            accessToken = data.accessToken;
            return accessToken;
        } catch (err) {
            console.error('Failed to get access token:', err);
            return null;
        }
    }

    /** 会話データを取得する関数 */
    async function fetchConversationData(chatId) {
        const token = await getAccessToken();
        if (!token) return null;
        try {
            const res = await fetch(`/backend-api/conversation/${chatId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Authorization': `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error(res.statusText);
            return await res.json();
        } catch (err) {
            console.error('Failed to fetch conversation data:', err);
            return null;
        }
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
            color: settings.color,
            display: 'block',
            textAlign: role === 'user' ? 'right' : 'left',
            marginTop: '4px'
        });
        
        // Append to a specific sub-container if needed, or directly to the message elem
        // We append to the main element to ensure it's visible at the bottom
        messageElem.appendChild(timeEl);
    }

    const processedIds = new Set();
    const mainElem = document.querySelector('main');
    let suppressObserver = false;
    let suppressedQueue = [];
    
    const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
            for (const node of mut.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                let messageElements = [];
                if (node.hasAttribute && node.hasAttribute('data-message-id')) {
                    messageElements.push(node);
                } else {
                    messageElements = Array.from(node.querySelectorAll?.('[data-message-id]') || []);
                }
                for (const msgElem of messageElements) {
                    const msgId = msgElem.getAttribute('data-message-id');
                    if (!msgId || processedIds.has(msgId)) continue;
                    if (suppressObserver) {
                        suppressedQueue.push(msgId);
                    } else {
                        updateMessageTimestamp(msgElem, msgId);
                    }
                }
            }
        }
    });

    // Make sure we observe the main element even if it loads late
    function startObserving() {
        const main = document.querySelector('main');
        if (main) {
            observer.observe(main, { childList: true, subtree: true });
        } else {
            setTimeout(startObserving, 1000);
        }
    }
    startObserving();

    async function updateMessageTimestamp(messageElem, messageId, retryCount = 0) {
        const chatId = getCurrentChatId();
        if (!chatId) return;
        const convo = await fetchConversationData(chatId);
        if (!convo || !convo.mapping) return;
        const node = convo.mapping[messageId];
        if (!node || !node.message || node.message.create_time === undefined) {
            if (retryCount < 10) {
                setTimeout(() => updateMessageTimestamp(messageElem, messageId, retryCount + 1), 1000);
            }
        } else {
            appendTimestampElement(messageElem, node.message.create_time);
            processedIds.add(messageId);
        }
    }

    async function processAllMessagesInConversation() {
        const chatId = getCurrentChatId();
        if (!chatId) return;
        const convo = await fetchConversationData(chatId);
        if (!convo) return;
        
        const mapping = convo.mapping || {};
        const startNodeId = convo.current_node || Object.values(mapping).find(n => !n.children || n.children.length === 0)?.id;
        if (!startNodeId) return;
        
        const nodes = [];
        let nodeId = startNodeId;
        while (nodeId) {
            const node = mapping[nodeId];
            if (!node) break;
            if (node.parent === undefined) break;
            const msg = node.message;
            if (msg && msg.author.role !== 'system' &&
                msg.content?.content_type !== 'model_editable_context' &&
                msg.content?.content_type !== 'user_editable_context') {
                nodes.unshift(node);
            }
            nodeId = node.parent;
        }
        
        for (const node of nodes) {
            const msg = node.message;
            if (!msg || msg.id === undefined || msg.create_time === undefined) continue;
            const msgId = msg.id;
            const elem = document.querySelector(`[data-message-id="${msgId}"]`);
            if (elem && !processedIds.has(msgId)) {
                appendTimestampElement(elem, msg.create_time);
                processedIds.add(msgId);
            }
        }
    }

    let currentChatId = null;
    setInterval(() => {
        const chatId = getCurrentChatId();
        if (chatId && chatId !== currentChatId) {
            currentChatId = chatId;
            processedIds.clear();
            suppressObserver = true;
            suppressedQueue = [];
            
            setTimeout(async () => {
                await processAllMessagesInConversation();
                for (const newId of suppressedQueue) {
                    const elem = document.querySelector(`[data-message-id="${newId}"]`);
                    if (elem && !processedIds.has(newId)) {
                        updateMessageTimestamp(elem, newId);
                    }
                }
                suppressedQueue = [];
                suppressObserver = false;
            }, 500);
        }
    }, 1000);
})();