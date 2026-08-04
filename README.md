# Knowledge Graph Live

A mobile-first knowledge-graph viewer that opens the exact nodes referenced by a ChatGPT answer.

## Current status

- Default branch: `HAHA`
- Pull request #1: merged
- Pull request #2: merged
- Feature branch: synchronized with `HAHA`
- Automatic Pages workflow: `.github/workflows/deploy-pages.yml`
- Visible product name: **Knowledge Graph Live**
- Current repository slug: `MeJPeezy/New`
- Intended repository slug: `MeJPeezy/knowledge-graph-live`

No pull request remains to be merged.

## Use it now on mobile

This link works directly from the repository and does not require GitHub Pages to be enabled:

```text
https://raw.githack.com/MeJPeezy/New/HAHA/viewer.html
```

Open a highlighted subgraph through:

```text
https://raw.githack.com/MeJPeezy/New/HAHA/viewer.html?nodes=M6,C4,K1,K3
```

On the first HTML visit, the rendering service may show a confirmation screen. Continue once; it then opens the viewer. The viewer supports tap selection, drag-to-pan, pinch-to-zoom, search, fit, clear, and shareable node-highlight URLs.

## Native GitHub Pages deployment

The expected native Pages address remains:

```text
https://mejpeezy.github.io/New/
```

Every push to `HAHA` triggers the official GitHub Pages workflow using:

- `actions/checkout@v6`
- `actions/configure-pages@v5`
- `actions/upload-pages-artifact@v4`
- `actions/deploy-pages@v4`

The workflow has `pages: write` and `id-token: write` permissions and deploys the repository as a static Pages artifact whenever Pages is available for the repository.

## ChatGPT project integration

Copy `PROJECT_INSTRUCTIONS.md` into the ChatGPT Project instructions. Graph-grounded answers should include the repository-rendered mobile viewer link followed by:

```text
Graph nodes: [M6, C4, K1, K3]
```

## Environment

The primary environment is a mobile browser. Desktop Chrome/Edge extension files remain in the repository only as an optional fallback. Chrome on Android or iOS cannot load unpacked desktop extensions.

## Authorized cybersecurity model

The project instructions support real cybersecurity research against user-owned assets, explicitly consented targets, and legitimate in-scope bug-bounty assets. Tooling should remain tied to the applicable ownership, written authorization, or published program scope.

## Graphify interoperability

The viewer accepts both the included `edges` schema and Graphify's NetworkX-style `links` schema. Replace `graph.json` with a newly generated Graphify artifact when the project knowledge base changes.
