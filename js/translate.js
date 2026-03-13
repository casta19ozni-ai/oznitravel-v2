// dynamic auto translation using LibreTranslate (public instance)
// Detect browser language and translate all visible text nodes.
// New content added later will also be translated via MutationObserver.

(function () {
    const sourceLang = 'auto';
    const targetLang = (navigator.language || navigator.userLanguage || 'es').split('-')[0];
    const docLang = document.documentElement.lang || 'es';

    if (targetLang === docLang) {
        // same language as document, nothing to do
        return;
    }

    const cache = new Map();
    let translating = false;

    async function translateText(text) {
        if (!text.trim()) return text;
        if (cache.has(text)) {
            return cache.get(text);
        }
        try {
            const resp = await fetch('https://libretranslate.de/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: 'text',
                }),
            });
            const data = await resp.json();
            const translated = data.translatedText || text;
            cache.set(text, translated);
            return translated;
        } catch (err) {
            console.error('translation error', err);
            return text;
        }
    }

    async function handleNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            if (text && text.trim()) {
                const translated = await translateText(text);
                if (translated !== text) {
                    node.textContent = translated;
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // attributes that contain user-facing text
            ['placeholder', 'title', 'alt', 'value'].forEach(attr => {
                if (node.hasAttribute(attr)) {
                    const orig = node.getAttribute(attr);
                    if (orig && orig.trim()) {
                        translateText(orig).then(t => {
                            if (t !== orig) node.setAttribute(attr, t);
                        });
                    }
                }
            });
            // skip script/style tags
            if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) return;
            for (const child of node.childNodes) {
                await handleNode(child);
            }
        }
    }

    const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === 'childList') {
                m.addedNodes.forEach(n => handleNode(n));
            } else if (m.type === 'characterData') {
                handleNode(m.target);
            }
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        // initial translation pass
        handleNode(document.body).then(() => {
            // start observing after initial pass
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        });
    });
})();
