(() => {
  'use strict';

  const canvas = document.getElementById('graph');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const status = document.getElementById('status');
  const details = document.getElementById('details');
  const search = document.getElementById('search');

  let graph = { nodes: [], edges: [] };
  let nodeById = new Map();
  let adjacency = new Map();
  let highlighted = new Set();
  let primary = new Set();
  let selected = null;
  let hovered = null;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;
  let dragStart = null;

  const palette = {
    Source: '#a78bfa', Concept: '#60a5fa', Risk: '#fb7185', Governance: '#f59e0b',
    Method: '#ef4444', 'Method Component': '#f97316', Defense: '#34d399',
    Representation: '#22d3ee', Variant: '#f472b6', Dataset: '#38bdf8',
    'Utility Benchmark': '#2dd4bf', Model: '#c084fc', Metric: '#facc15',
    Finding: '#fde047', Workflow: '#4ade80', 'Workflow Stage': '#86efac',
    Interface: '#e879f9', 'Defense Concept': '#6ee7b7', 'Experimental Condition': '#fb923c',
    'Experimental Component': '#fdba74'
  };

  function colorFor(type) { return palette[type] || '#94a3b8'; }

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
    const rawEdges = raw.edges || raw.links || [];
    const edges = rawEdges.map(e => ({
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
      if (adjacency.has(e.source)) adjacency.get(e.source).add(e.target);
      if (adjacency.has(e.target)) adjacency.get(e.target).add(e.source);
    });
  }

  function layout() {
    const groups = new Map();
    graph.nodes.forEach(n => {
      if (!groups.has(n.type)) groups.set(n.type, []);
      groups.get(n.type).push(n);
    });
    const types = [...groups.keys()].sort();
    const ringGap = 125;
    types.forEach((type, ringIndex) => {
      const group = groups.get(type);
      const radius = ringIndex === 0 ? 45 : 80 + ringIndex * ringGap;
      group.forEach((node, i) => {
        const angle = (Math.PI * 2 * i / Math.max(group.length, 1)) + ringIndex * 0.43;
        node.x = Math.cos(angle) * radius;
        node.y = Math.sin(angle) * radius;
        node.r = 6 + Math.min(5, (adjacency.get(node.id)?.size || 0) * 0.35);
      });
    });
    fit();
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function fit() {
    if (!graph.nodes.length) return;
    const rect = stage.getBoundingClientRect();
    const xs = graph.nodes.map(n => n.x);
    const ys = graph.nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = Math.max(1, maxX - minX + 100);
    const h = Math.max(1, maxY - minY + 100);
    scale = Math.max(0.08, Math.min((rect.width - 30) / w, (rect.height - 30) / h));
    offsetX = rect.width / 2 - ((minX + maxX) / 2) * scale;
    offsetY = rect.height / 2 - ((minY + maxY) / 2) * scale;
    draw();
  }

  function toScreen(n) { return { x: n.x * scale + offsetX, y: n.y * scale + offsetY }; }
  function toWorld(x, y) { return { x: (x - offsetX) / scale, y: (y - offsetY) / scale }; }

  function draw() {
    const rect = stage.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    graph.edges.forEach(e => {
      const a = nodeById.get(e.source), b = nodeById.get(e.target);
      if (!a || !b) return;
      const pa = toScreen(a), pb = toScreen(b);
      const active = highlighted.has(a.id) && highlighted.has(b.id);
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = active ? 'rgba(250,204,21,.78)' : 'rgba(148,163,184,.16)';
      ctx.lineWidth = active ? 1.8 : 0.8;
      ctx.stroke();
    });

    graph.nodes.forEach(n => {
      const p = toScreen(n);
      const isPrimary = primary.has(n.id);
      const isHighlighted = highlighted.has(n.id);
      const isSelected = selected === n.id;
      const isHovered = hovered === n.id;
      const radius = Math.max(3, n.r * Math.sqrt(scale));

      if (isHighlighted || isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + (isPrimary ? 9 : 6), 0, Math.PI * 2);
        ctx.fillStyle = isPrimary ? 'rgba(250,204,21,.28)' : 'rgba(96,165,250,.18)';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = colorFor(n.type);
      ctx.globalAlpha = highlighted.size && !isHighlighted ? 0.22 : 0.95;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = isPrimary ? '#fff7ae' : 'rgba(255,255,255,.55)';
      ctx.lineWidth = isPrimary ? 2.2 : 0.8;
      ctx.stroke();

      if (isHighlighted || isSelected || isHovered || scale > 0.7) {
        ctx.font = `${isPrimary ? 600 : 500} ${Math.max(9, Math.min(12, 10 * Math.sqrt(scale)))}px system-ui`;
        ctx.fillStyle = isHighlighted ? '#f8fafc' : 'rgba(226,232,240,.72)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = n.label.length > 34 ? `${n.label.slice(0, 31)}…` : n.label;
        ctx.fillText(label, p.x, p.y + radius + 4);
      }
    });
  }

  function nodeAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const world = toWorld(clientX - rect.left, clientY - rect.top);
    let best = null;
    let bestDistance = Infinity;
    graph.nodes.forEach(n => {
      const d = Math.hypot(n.x - world.x, n.y - world.y);
      const threshold = Math.max(12, n.r * 2.2 / Math.max(scale, .1));
      if (d < threshold && d < bestDistance) { best = n; bestDistance = d; }
    });
    return best;
  }

  function showDetails(id) {
    const n = nodeById.get(id);
    if (!n) return;
    const related = graph.edges.filter(e => e.source === id || e.target === id).slice(0, 12);
    details.innerHTML = `
      <strong>${escapeHtml(n.label)}</strong>
      <div class="muted">${escapeHtml(n.id)} · ${escapeHtml(n.type)} · Source: ${escapeHtml(n.source || '—')}</div>
      <div>${related.map(e => {
        const outbound = e.source === id;
        const other = nodeById.get(outbound ? e.target : e.source);
        return `<span class="pill">${outbound ? '→' : '←'} ${escapeHtml(e.relation)} ${escapeHtml(other?.label || '')}</span>`;
      }).join('')}</div>`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  }

  function highlight(ids, expandNeighbors = true) {
    primary = new Set(ids.filter(id => nodeById.has(id)));
    highlighted = new Set(primary);
    if (expandNeighbors) primary.forEach(id => adjacency.get(id)?.forEach(n => highlighted.add(n)));
    status.textContent = `${graph.nodes.length} nodes · ${graph.edges.length} edges · ${primary.size} referenced`;
    if (primary.size) {
      const first = [...primary][0];
      selected = first;
      showDetails(first);
      focusSet(highlighted);
    }
    draw();
  }

  function focusSet(ids) {
    const nodes = [...ids].map(id => nodeById.get(id)).filter(Boolean);
    if (!nodes.length) return;
    const rect = stage.getBoundingClientRect();
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y));
    const w = Math.max(80, maxX - minX + 90);
    const h = Math.max(80, maxY - minY + 90);
    scale = Math.max(.12, Math.min(2.2, (rect.width - 30) / w, (rect.height - 30) / h));
    offsetX = rect.width / 2 - ((minX + maxX) / 2) * scale;
    offsetY = rect.height / 2 - ((minY + maxY) / 2) * scale;
  }

  canvas.addEventListener('mousemove', e => {
    if (dragging && dragStart) {
      offsetX = dragStart.offsetX + (e.clientX - dragStart.x);
      offsetY = dragStart.offsetY + (e.clientY - dragStart.y);
      draw();
      return;
    }
    const node = nodeAt(e.clientX, e.clientY);
    hovered = node?.id || null;
    canvas.style.cursor = node ? 'pointer' : 'grab';
    draw();
  });
  canvas.addEventListener('mousedown', e => {
    dragging = true;
    dragStart = { x: e.clientX, y: e.clientY, offsetX, offsetY };
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mouseup', e => {
    if (!dragging) return;
    const moved = dragStart && Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 4;
    dragging = false;
    canvas.style.cursor = 'grab';
    if (!moved) {
      const node = nodeAt(e.clientX, e.clientY);
      if (node) { selected = node.id; showDetails(node.id); draw(); }
    }
    dragStart = null;
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const before = toWorld(sx, sy);
    scale = Math.max(.06, Math.min(4, scale * Math.exp(-e.deltaY * .0012)));
    offsetX = sx - before.x * scale;
    offsetY = sy - before.y * scale;
    draw();
  }, { passive: false });

  search.addEventListener('input', () => {
    const q = search.value.trim().toLowerCase();
    if (!q) return;
    const matches = graph.nodes.filter(n => n.id.toLowerCase() === q || n.label.toLowerCase().includes(q)).slice(0, 12);
    if (matches.length) highlight(matches.map(n => n.id), false);
  });
  document.getElementById('fit').addEventListener('click', fit);
  document.getElementById('clear').addEventListener('click', () => {
    primary.clear(); highlighted.clear(); selected = null;
    status.textContent = `${graph.nodes.length} nodes · ${graph.edges.length} edges`;
    details.innerHTML = '<span class="muted">Referenced nodes from the latest answer will highlight automatically.</span>';
    fit();
  });

  window.addEventListener('message', event => {
    const data = event.data;
    if (data?.type === 'GRAPHIFY_HIGHLIGHT' && Array.isArray(data.nodeIds)) {
      highlight(data.nodeIds.map(String), data.expandNeighbors !== false);
    }
  });

  new ResizeObserver(resize).observe(stage);

  fetch(chrome.runtime.getURL('graph.json'))
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(raw => {
      graph = normalizeGraph(raw);
      buildIndexes();
      layout();
      status.textContent = `${graph.nodes.length} nodes · ${graph.edges.length} edges`;
      resize();
    })
    .catch(error => {
      status.textContent = `Graph load failed: ${error.message}`;
      details.textContent = 'Replace graph.json with a valid Graphify graph artifact.';
    });
})();
