# Graphify Live References for ChatGPT

A mobile-first knowledge-graph viewer that opens the exact nodes referenced by a ChatGPT answer.

The repository follows Graphify's artifact model: a persistent `graph.json`, an interactive graph viewer, and explicit node-level provenance. The included graph is the current anchoring-safety graph generated from this project's sources.

## Primary environment: mobile browser

The user does not have a conventional PC and uses ChatGPT through a mobile browser, sometimes in desktop-site mode.

Chrome on mobile cannot load unpacked Chrome extensions, and desktop-site mode does not add desktop extension support. The extension files in this repository are therefore an optional desktop fallback—not the primary workflow.

The primary workflow is a GitHub Pages-hosted graph viewer:

```text
https://mejpeezy.github.io/New/?nodes=M6,C4,K1,K3
```

The `nodes` query parameter identifies the nodes to highlight. The viewer also expands their immediate neighbors.

## Mobile setup

These steps can be completed from GitHub's mobile website:

1. Merge the `graphify-chatgpt-live` pull request into the repository's `HAHA` branch.
2. Open the repository on GitHub.
3. Open **Settings**. On a narrow screen, this may be under the repository navigation dropdown.
4. Open **Pages** under **Code and automation**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select branch **HAHA** and folder **/(root)**, then save.
7. Open the published site shown by GitHub Pages.

After Pages is active, the expected viewer address is:

```text
https://mejpeezy.github.io/New/
```

## ChatGPT project instructions

Copy `PROJECT_INSTRUCTIONS.md` into this ChatGPT project's instructions.

The instructions make graph use explicit and require each graph-grounded answer to end with:

```text
Graph nodes: [M6, C4, K1, K3]
```

For mobile use, the answer should also include a clickable link such as:

```text
https://mejpeezy.github.io/New/?nodes=M6,C4,K1,K3
```

Tapping the link opens the graph with those nodes already highlighted. This is reliable on mobile because it does not depend on browser extensions or DOM injection into ChatGPT.

## Authorized cybersecurity model

The project instructions support real, working cybersecurity research against user-owned assets, explicitly consented targets, and legitimate in-scope bug-bounty assets. They do not force fake code or toy examples merely because the work is security-related.

Target-specific testing should remain tied to the applicable ownership, written authorization, or published bug-bounty scope. Chat privacy alone is not target authorization.

## Graphify integration

On a system capable of running Graphify:

```bash
uv tool install graphifyy
graphify install --project --platform codex
graphify .
```

Replace this repository's `graph.json` with the generated `graphify-out/graph.json`. The viewer accepts both this project's `edges` schema and Graphify's NetworkX-style `links` schema.

A mobile-only user does not need to run these commands personally; the graph artifact can be generated through a hosted runner, GitHub Actions, another authorized machine, or supplied directly to the repository.

## Optional desktop extension

`manifest.json`, `content.js`, `content.css`, `viewer.html`, and `viewer.js` also form a Chrome/Edge extension for a desktop browser capable of loading unpacked extensions. It can dock the graph beside ChatGPT and automatically parse the `Graph nodes: [...]` footer.

This extension is not expected to work in Chrome on Android or iOS.

## Upstream

Designed to interoperate with `Graphify-Labs/graphify` and its Apache-2.0 graph artifact conventions. This repository does not modify or redistribute Graphify source code.
