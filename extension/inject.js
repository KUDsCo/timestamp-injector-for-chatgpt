(() => {
    'use strict';

    // These are in-memory records for this tab. Keep only the role and creation time.
    const times = new Map();
    const roles = new Set(['user', 'assistant']);
    function remember(message) {
        if (!message || !roles.has(message.author?.role) || typeof message.id !== 'string') return;
        const seconds = message.create_time;
        if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 253402300799) return;
        if (times.get(message.id)?.seconds === seconds) return;
        times.set(message.id, {role: message.author.role, seconds});
        schedule();
    }

    function readHistory(data) {
        if (Array.isArray(data?.messages)) data.messages.forEach(remember);
        if (data?.mapping) {
            for (const node of Object.values(data.mapping)) remember(node?.message);
        }
    }

    // Observe the same history response that ChatGPT requests, including later pages.
    const parse = JSON.parse;
    function readOutgoing(input, init) {
        const method = init?.method || input?.method;
        if (method?.toUpperCase() !== 'POST') return;
        const url = new URL(input?.url || input, location.href);
        if (url.origin !== location.origin ||
            !/^\/(?:backend-api|backend-anon)\/(?:f\/)?conversation\/?$/.test(url.pathname)) return;

        if (typeof init?.body === 'string') {
            readHistory(parse(init.body));
        } else if (!init?.body && input instanceof Request &&
                   input.headers.get('content-type')?.includes('application/json')) {
            input.clone().json().then(readHistory).catch(() => {});
        }
    }

    const fetchPage = window.fetch;
    window.fetch = function (...args) {
        // Some new chats are rendered entirely from a POST and streamed reply.
        try { readOutgoing(args[0], args[1]); } catch { /* Leave the site's request untouched. */ }
        const request = fetchPage.apply(this, args);
        request.then(response => {
            if (!response.ok || !response.url) return;
            const url = new URL(response.url);
            if (url.origin !== location.origin ||
                !/^\/(?:backend-api|backend-anon)\/conversations?\/[\da-f-]+(?:\/messages)?\/?$/i.test(url.pathname)) return;
            return response.clone().json().then(readHistory);
        }).catch(() => {});
        return request;
    };

    // Live stream events and initial client data can arrive before history is requested.
    JSON.parse = function (...args) {
        const data = parse.apply(this, args);
        if (!data || typeof data !== 'object' || typeof args[1] === 'function') return data;
        try {
            if (data.conversation_id || data.mapping) readHistory(data);
            remember(data.message);
            remember(data.v?.message);
            if (data.p === '/message') remember(data.v);
        } catch { /* Extension processing must never change the parser result. */ }
        return data;
    };

    function resolveMessage(element, role, ids) {
        const allowed = new Set(ids);
        const key = Object.keys(element).find(name => name.startsWith('__reactFiber$'));
        for (let f = element[key], i = 0; f && i < 32; f = f.return, i++) {
            const props = f.memoizedProps;
            const item = props?.item;
            if (item?.type === role + '-message') {
                for (const id of [item.latestMessageId, item.serverMessageId, item.messageId]) {
                    if ((!allowed.size || allowed.has(id)) && times.get(id)?.role === role) return times.get(id);
                }
            }
            // Older layouts expose the actual message directly in component props.
            if (Array.isArray(props?.messages)) {
                for (const m of props.messages) {
                    if (m?.author?.role === role && allowed.has(m.id)) remember(m);
                }
            }
        }
        const matches = ids.map(id => times.get(id)).filter(record => record?.role === role);
        return matches.length === 1 ? matches[0] : null;
    }

    const defaults = {enabled: true, textColor: '#888888', fontSize: '0.875rem', dateFormat: 'YYYY/MM/DD HH:mm:ss'};
    let settings = defaults;
    function updateSettings() {
        const value = document.body?.getAttribute('data-chatgpt-timestamp-settings');
        if (!value) return;
        try { settings = {...defaults, ...parse(value)}; } catch { return; }
    }

    function format(date) {
        const pad = n => String(n).padStart(2, '0');
        const parts = {YYYY: date.getFullYear(), MM: pad(date.getMonth()+1), DD: pad(date.getDate()),
            HH: pad(date.getHours()), mm: pad(date.getMinutes()), ss: pad(date.getSeconds())};
        return settings.dateFormat.replace(/YYYY|MM|DD|HH|mm|ss/g, key => parts[key]);
    }

    const rendered = new WeakMap();
    function render() {
        const stale = new Set(document.querySelectorAll('time.chatgpt-timestamp'));
        const seen = new Set();
        for (const element of document.querySelectorAll('[data-conversation-role], [data-message-id][data-message-author-role]')) {
            const role = element.dataset.conversationRole || element.dataset.messageAuthorRole;
            if (!roles.has(role)) continue;
            const legacy = element.closest('[data-message-id][data-message-author-role]');
            const host = legacy || element.parentElement;
            if (!host || seen.has(host)) continue;
            seen.add(host);
            const unit = element.closest('[data-chatgpt-search-message-ids]') ||
                         host.querySelector('[data-chatgpt-search-message-ids]');
            const ids = legacy ? [legacy.dataset.messageId] :
                (unit?.dataset.chatgptSearchMessageIds || '').split(/\s+/).filter(Boolean);
            const record = resolveMessage(element, role, ids);
            if (!record || !settings.enabled) continue;
            const time = host.querySelector(':scope > time.chatgpt-timestamp') || document.createElement('time');
            stale.delete(time);
            const previous = rendered.get(time);
            if (previous?.record === record && previous.settings === settings && previous.role === role) continue;
            const date = new Date(record.seconds * 1000);
            const label = format(date);
            if (time.textContent !== label) time.textContent = label;
            time.className = 'chatgpt-timestamp w-full';
            time.dateTime = date.toISOString();
            time.title = date.toLocaleString();
            Object.assign(time.style, {display: 'block', color: settings.textColor, fontSize: settings.fontSize,
                fontStyle: 'italic', opacity: '0.8', textAlign: role === 'user' ? 'right' : 'left', marginTop: '4px'});
            if (!time.parentNode) host.appendChild(time);
            rendered.set(time, {record, role, settings});
        }
        for (const time of stale) time.remove();
    }

    let scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; render(); });
    }
    new MutationObserver(mutations => {
        if (mutations.some(m => m.attributeName === 'data-chatgpt-timestamp-settings')) updateSettings();
        schedule();
    }).observe(document, {childList: true, subtree: true, attributes: true,
        attributeFilter: ['data-chatgpt-timestamp-settings','data-conversation-role','data-message-id','data-chatgpt-search-message-ids']});
    updateSettings();
    schedule();
})();
