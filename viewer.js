(() => {
  'use strict';

  const canvas = document.getElementById('graph');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const status = document.getElementById('status');
  const details = document.getElementById('details');
  const search = document.getElementById('search');
  const shareButton = document.getElementById('share');

  let graph = { nodes: [], edges: [] };
  let nodeById = new Map();
  let adjacency = new Map();
  let primary = new Set();
  let highlighted = new Set();
  let selected = null;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dpr = 1;

  const pointers = new Map();
  let gesture = null;

  const palette = {
    Source: '#a78bfa', Concept: '#60a5fa', Risk: '#fb7185', Governance: '#f59e0b',
    Method: '#ef4444', 'Method Component': '#f97316', Defense: '#34d399',
    Representation: '#22d3ee', Variant: '#f472b6', Dataset: '#38bdf8',
    'Utility Benchmark': '#2dd4bf', Model: '#c084fc', Metric: '#facc15',
    Finding: '#fde047', Workflow: '#4ade80', 'Workflow Stage': '#86efac',
    Interface: '#e879f9', 'Defense Concept': '#6ee7b7', 'Experimental Condition': '#fb923c',
    'Experimental Component': '#fdba74'
  };

  const esc = value => String(value).replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));

  function normalizeGraph(raw) {
    const nodes = (raw.nodes || []).map((n, index) => ({
      ...n,
      id: String(n.id),
      label: n.label || String(n.id),
      type: n.type || n.file_type || 'Unknown',
      source: n.source || n.source_file || '',
      index,
      x: 0,
      y: 0,
      r: 7
    }));
    const edges = (raw.edges || raw.links || []).map(e => ({
      source: String(e.source ?? e.from),
      target: String(e.target ?? e.to),
      relation: e.relation || e.label || e.type || 'related to',
      confidence: e.confidence || 'EXTRACTED'
    }));
    return { nodes, edges };
  }

  function buildIndexes() {
    nodeById = new Map(graph.nodes.map(n => [n.id, n]));
    adjacency = new Map(graph.nodes.map(n => [n.id, new Set()]));
    graph.edges.forEach(e => {
      adjacency.get(e.source)?.add(e.target);
      adjacency.get(e.target)?.add(e.source);
    });
  }

  function layout() {
    const groups = new Map();
    graph.nodes.forEach(n => {
      const key = n.type || 'Unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(n);
    });

    [...groups.keys()].sort().forEach((type, ringIndex) => {
      const group = groups.get(type);
      const radius = ringIndex === 0 ? 55 : 95 + ringIndex * 120;
      group.forEach((node, i) => {
        const angle = (Math.PI * 2 * i / Math.max(group.length, 1)) + ringIndex * 0.41;
        node.x = Math.cos(angle) * radius;
        node.y = Math.sin(angle) * radius;
        node.r = 6 + Math.min(5, (adjacency.get(node.id)?.size || 0) * 0.35);
      });
    });
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function boundsFor(nodes) {
    return {
      minX: Math.min(...nodes.map(n => n.x)), maxX: Math.max(...nodes.map(n => n.x)),
      minY: Math.min(...nodes.map(n => n.y)), maxY: Math.max(...nodes.map(n => n.y))
    };
  }

  function focusNodes(nodes, maxScale = 2.4) {
    if (!nodes.length) return;
    const rect = stage.getBoundingClientRect();
    const b = boundsFor(nodes);
    const width = Math.max(100, b.maxX - b.minX + 120);
    const height = Math.max(100, b.maxY - b.minY + 120);
    scale = Math.max(0.06, Math.min(maxScale, (rect.width - 24) / width, (rect.height - 24) / height));
    offsetX = rect.width / 2 - ((b.minX + b.maxX) / 2) * scale;
    offsetY = rect.height / 2 - ((b.minY + b.maxY) / 2) * scale;
    draw();
  }

  function fit() {
    focusNodes(graph.nodes, 1.3);
  }

  function toScreen(node) {
    return { x: node.x * scale + offsetX, y: node.y * scale + offsetY };
  }

  function toWorld(x, y) {
    return { x: (x - offsetX) / scale, y: (y - offsetY) / scale };
  }

  function draw() {
    const rect = stage.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    graph.edges.forEach(edge => {
      const a = nodeById.get(edge.source);
      const b = nodeById.get(edge.target);
      if (!a || !b) return;
      const pa = toScreen(a);
      const pb = toScreen(b);
      const active = highlighted.has(a.id) && highlighted.has(b.id);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = active ? 'rgba(250,204,21,.78)' : 'rgba(148,163,184,.15)';
      ctx.lineWidth = active ? 1.8 : 0.8;
      ctx.stroke();
    });

    graph.nodes.forEach(node => {
      const p = toScreen(node);
      const direct = primary.has(node.id);
      const active = highlighted.has(node.id);
      const chosen = selected === node.id;
      const radius = Math.max(3.5, node.r * Math.sqrt(Math.max(scale, 0.1)));

      if (active || chosen) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + (direct ? 9 : 6), 0, Math.PI * 2);
        ctx.fillStyle = direct ? 'rgba(250,204,21,.28)' : 'rgba(96,165,250,.18)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = palette[node.type] || '#94a3b8';
      ctx.globalAlpha = highlighted.size && !active ? 0.2 : 0.96;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = direct ? '#fff7ae' : 'rgba(255,255,255,.55)';
      ctx.lineWidth = direct ? 2.2 : 0.8;
      ctx.stroke();

      if (active || chosen || scale > 0.72) {
        const fontSize = Math.max(9, Math.min(12, 10 * Math.sqrt(Math.max(scale, 0.2))));
        ctx.font = `${direct ? 650 : 500} ${fontSize}px system-ui`;
        ctx.fillStyle = active ? '#f8fafc' : 'rgba(226,232,240,.72)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = node.label.length > 34 ? `${node.label.slice(0, 31)}…` : node.label;
        ctx.fillText(label, p.x, p.y + radius + 4);
      }
    });
  }

  function nodeAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const world = toWorld(clientX - rect.left, clientY - rect.top);
    let best = null;
    let distance = Infinity;
    graph.nodes.forEach(node => {
      const d = Math.hypot(node.x - world.x, node.y - world.y);
      const threshold = Math.max(12, node.r * 2.4 / Math.max(scale, 0.1));
      if (d < threshold && d < distance) {
        best = node;
        distance = d;
      }
    });
    return best;
  }

  function showDetails(id) {
    const node = nodeById.get(id);
    if (!node) return;
    const relations = graph.edges.filter(e => e.source === id || e.target === id).slice(0, 14);
    details.innerHTML = `
      <strong>${esc(node.label)}</strong>
      <div class="muted">${esc(node.id)} · ${esc(node.type)} · Source: ${esc(node.source || '—')}</div>
      <div>${relations.map(edge => {
        const outbound = edge.source === id;
        const other = nodeById.get(outbound ? edge.target : edge.source);
        return `<span class="pill">${outbound ? '→' : '←'} ${esc(edge.relation)} ${esc(other?.label || '')}</span>`;
      }).join('')}</div>`;
  }

  function currentIds() {
    return [...primary];
  }

  function updateAddressBar() {
    if (typeof history === 'undefined' || typeof location === 'undefined') return;
    const url = new URL(location.href);
    if (primary.size) url.searchParams.set('nodes', currentIds().join(','));
    else url.searchParams.delete('nodes');
    history.replaceState(null, '', url);
  }

  function highlight(ids, expandNeighbors = true, updateUrl = true) {
    primary = new Set(ids.map(String).filter(id => nodeById.has(id)));
    highlighted = new Set(primary);
    if (expandNeighbors) {
      primary.forEach(id => adjacency.get(id)?.forEach(neighbor => highlighted.add(neighbor)));
    }

    status.textContent = `${graph.nodes.length} nodes · ${graph.edges.length} edges · ${primary.size} referenced`;
    if (primary.size) {
      selected = currentIds()[0];
      showDetails(selected);
      focusNodes([...highlighted].map(id => nodeById.get(id)).filter(Boolean));
    } else {
      selected = null;
      details.innerHTML = '<span class="muted">No referenced nodes selected.</span>';
      fit();
    }
    if (updateUrl) updateAddressBar();
    draw();
  }

  function parseUrlNodes() {
    const params = new URLSearchParams(location.search);
    return (params.get('nodes') || '')
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
  }

  function pointDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pointMidpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  canvas.addEventListener('pointerdown', event => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      gesture = {
        type: 'pan',
        startX: event.clientX,
        startY: event.clientY,
        offsetX,
        offsetY,
        moved: false
      };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const rect = canvas.getBoundingClientRect();
      const midpoint = pointMidpoint(a, b);
      gesture = {
        type: 'pinch',
        distance: pointDistance(a, b),
        scale,
        world: toWorld(midpoint.x - rect.left, midpoint.y - rect.top)
      };
    }
  });

  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size === 1 && gesture?.type === 'pan') {
      const dx = event.clientX - gesture.startX;
      const dy = event.clientY - gesture.startY;
      gesture.moved ||= Math.hypot(dx, dy) > 4;
      offsetX = gesture.offsetX + dx;
      offsetY = gesture.offsetY + dy;
      draw();
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const rect = canvas.getBoundingClientRect();
      const midpoint = pointMidpoint(a, b);
      const distance = Math.max(1, pointDistance(a, b));
      const base = gesture?.type === 'pinch' ? gesture : {
        distance,
        scale,
        world: toWorld(midpoint.x - rect.left, midpoint.y - rect.top)
      };
      scale = Math.max(0.06, Math.min(4, base.scale * distance / Math.max(1, base.distance)));
      offsetX = midpoint.x - rect.left - base.world.x * scale;
      offsetY = midpoint.y - rect.top - base.world.y * scale;
      gesture = { ...base, type: 'pinch' };
      draw();
    }
  });

  function endPointer(event) {
    const wasTap = pointers.size === 1 && gesture?.type === 'pan' && !gesture.moved;
    pointers.delete(event.pointerId);
    if (wasTap) {
      const node = nodeAt(event.clientX, event.clientY);
      if (node) {
        selected = node.id;
        showDetails(node.id);
        draw();
      }
    }
    if (!pointers.size) gesture = null;
  }

  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const before = toWorld(x, y);
    scale = Math.max(0.06, Math.min(4, scale * Math.exp(-event.deltaY * 0.0012)));
    offsetX = x - before.x * scale;
    offsetY = y - before.y * scale;
    draw();
  }, { passive: false });

  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    if (!query) return;
    const matches = graph.nodes
      .filter(n => n.id.toLowerCase() === query || n.label.toLowerCase().includes(query))
      .slice(0, 12)
      .map(n => n.id);
    if (matches.length) highlight(matches, false);
  });

  document.getElementById('fit').addEventListener('click', fit);
  document.getElementById('clear').addEventListener('click', () => highlight([], false));

  shareButton.addEventListener('click', async () => {
    updateAddressBar();
    const value = location.href;
    try {
      await navigator.clipboard.writeText(value);
      shareButton.textContent = 'Copied';
    } catch {
      const input = document.createElement('textarea');
      input.value = value;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
      shareButton.textContent = 'Copied';
    }
    setTimeout(() => { shareButton.textContent = 'Copy link'; }, 1200);
  });

  window.addEventListener('message', event => {
    const data = event.data;
    if (data?.type === 'GRAPHIFY_HIGHLIGHT' && Array.isArray(data.nodeIds)) {
      highlight(data.nodeIds, data.expandNeighbors !== false);
    }
  });

  new ResizeObserver(resize).observe(stage);

  const graphUrl = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
    ? chrome.runtime.getURL('graph.json')
    : 'graph.json';

  fetch(graphUrl)
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(raw => {
      graph = normalizeGraph(raw);
      buildIndexes();
      layout();
      status.textContent = `${graph.nodes.length} nodes · ${graph.edges.length} edges`;
      resize();
      const requested = parseUrlNodes();
      if (requested.length) highlight(requested, true, false);
      else fit();
    })
    .catch(error => {
      status.textContent = `Graph load failed: ${error.message}`;
      details.textContent = 'The viewer requires graph.json beside viewer.html.';
    });
})();
