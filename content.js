(() => {
  const PANEL_ID = 'graphify-live-panel';
  const MARKER = /Graph nodes:\s*\[([^\]]*)\]/gi;
  let lastSignature = '';

  function mount() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement('aside');
    panel.id = PANEL_ID;
    panel.setAttribute('aria-label', 'Graphify live knowledge graph');

    const toggle = document.createElement('button');
    toggle.id = 'graphify-live-toggle';
    toggle.type = 'button';
    toggle.textContent = '🧠 Graph';
    toggle.title = 'Toggle live knowledge graph';

    const frame = document.createElement('iframe');
    frame.id = 'graphify-live-frame';
    frame.src = chrome.runtime.getURL('viewer.html');
    frame.title = 'Graphify live knowledge graph';

    toggle.addEventListener('click', () => {
      const collapsed = panel.classList.toggle('graphify-collapsed');
      document.body.classList.toggle('graphify-live-open', !collapsed);
    });

    panel.append(toggle, frame);
    document.documentElement.appendChild(panel);
    document.body.classList.add('graphify-live-open');
  }

  function parseNodeIds(text) {
    const matches = [...text.matchAll(MARKER)];
    if (!matches.length) return [];
    const raw = matches[matches.length - 1][1];
    return [...new Set(raw.split(',').map(v => v.trim()).filter(Boolean))];
  }

  function scan() {
    const assistantTurns = document.querySelectorAll(
      '[data-message-author-role="assistant"], article[data-testid^="conversation-turn"]'
    );
    const latest = assistantTurns[assistantTurns.length - 1];
    if (!latest) return;

    const text = latest.innerText || latest.textContent || '';
    const ids = parseNodeIds(text);
    const signature = ids.join('|');
    if (!ids.length || signature === lastSignature) return;

    lastSignature = signature;
    const frame = document.getElementById('graphify-live-frame');
    frame?.contentWindow?.postMessage(
      { type: 'GRAPHIFY_HIGHLIGHT', nodeIds: ids, expandNeighbors: true },
      '*'
    );
  }

  mount();
  const observer = new MutationObserver(() => {
    mount();
    scan();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
  window.addEventListener('load', scan);
  setInterval(scan, 1500);
})();
