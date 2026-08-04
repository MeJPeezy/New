# Graphify Live References for ChatGPT

A local Chrome/Edge extension that docks a knowledge graph beside ChatGPT and highlights the exact nodes referenced by each assistant answer.

It follows Graphify's core artifact model: a persistent `graph.json`, an interactive graph viewer, and explicit node-level provenance. Graphify itself produces `graphify-out/graph.json`, `graph.html`, and `GRAPH_REPORT.md`; this bridge consumes the graph JSON and adds conversation-driven highlighting.

## Install Graphify

```bash
uv tool install graphifyy
graphify install --project --platform codex
/graphify .
```

Copy the resulting `graphify-out/graph.json` over this repository's `graph.json`. The included graph is the anchoring-safety graph created from the current project sources.

## Install the browser extension

1. Download or clone this branch.
2. Open `chrome://extensions` or `edge://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this repository folder.
5. Open ChatGPT. The graph appears docked on the right.

## Make highlighting automatic

Add the contents of `PROJECT_INSTRUCTIONS.md` to the ChatGPT Project instructions. Each graph-grounded answer will then end with:

```text
Graph nodes: [M6, K2, F7]
```

The extension detects the marker and highlights those nodes plus their immediate neighbors.

## Important platform boundary

ChatGPT Projects do not currently expose a native extension API for persistent custom side panels. The browser extension supplies that missing UI layer. Project source files alone cannot inject a live graph into the ChatGPT interface.

## Upstream

Built to interoperate with `Graphify-Labs/graphify` and its Apache-2.0 graph artifact conventions. This repository does not modify or redistribute Graphify source code.
