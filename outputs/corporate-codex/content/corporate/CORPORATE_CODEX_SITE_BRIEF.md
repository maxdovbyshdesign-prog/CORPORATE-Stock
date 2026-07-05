# CORPORATE Codex Site — Implementation Brief

This document defines the intended architecture and behavior for the personal CORPORATE codex / market-feed website.

The site is a mood piece, inspiration tool, and living lore codex for the creator.

---

## 1. Purpose

The site should help the creator enter the world of CORPORATE while working.

It is not a public marketing site.

It is not a full game.

It is not a generic wiki.

It is a grounded financial/news interface that presents lore as market data, media artifacts, public statements, reports, and dashboard signals.

Core sentence:

> Corporate Codex is not a wiki. It is a market interface watching a war.

---

## 2. Content-Driven Architecture

The site should be content-driven.

Approved lore should live in editable files, so the creator can update the world over time and the site can pull those changes into the interface.

Recommended content folder:

content/
  corporate/
    CORPORATE_LORE_BIBLE.md
    CORPORATE_TONE_GUIDE.md
    CORPORATE_ENTITIES.md
    CORPORATE_MEDIA_FRAGMENTS.md
    CORPORATE_CODEX_SITE_BRIEF.md

In a Vite/React project, these files can be imported as raw markdown using:

import.meta.glob('/content/corporate/*.md', { query: '?raw', import: 'default', eager: true })

or a similar local raw import approach.

Keep the site static. No backend. No real APIs.

---

## 3. Data Model

The site can use a hybrid approach:

1. Structured TypeScript data for market simulation:
   - ticker;
   - fullName;
   - type;
   - basePrice;
   - volatility;
   - trendBias;
   - tags;
   - relationships;
   - headline pool;
   - document IDs.

2. Markdown files for long-form lore:
   - lore bible;
   - tone guide;
   - entity notes;
   - media fragments;
   - implementation brief.

This allows:
- stable UI behavior from structured data;
- flexible lore updates from markdown;
- easy future expansion.

---

## 4. Main Views

### Dashboard

Main market screen.

Header:
INNER WORLDS MARKET FEED

Subheader:
Proxima Exposure / Live Simulated Feed

Should include:
- ticker cards;
- prices;
- daily changes;
- percentage changes;
- sparklines;
- current headlines;
- market status;
- warning/status pills.

Useful status pills:
- MARKET OPEN
- FLARE ACTIVITY: MODERATE
- SIGNAL QUALITY: DEGRADED
- PUBLIC VISIBILITY: ELEVATED
- LEGAL EXPOSURE: MANAGED
- PROXIMA LOCAL CYCLE: [generated value]

---

### Entity Detail

Opened by clicking a ticker.

Should show:
- ticker and full name;
- type/category;
- price movement;
- short profile;
- current exposure;
- risk tags;
- related entities;
- latest headlines;
- one or more media/document excerpts;
- optional link to relevant markdown source.

---

### Media Feed

Scrolling feed of:
- breaking news;
- market notes;
- official statements;
- UNICOL report fragments;
- EXEX press briefing excerpts;
- OPSEC talk fragments;
- public reaction snippets;
- PSA directives.

This should feel like a live information layer, not an encyclopedia.

---

### Lore Documents / Codex

Optional page that shows the markdown files more directly.

This can be simple:
- list of documents;
- click document;
- render raw markdown or simple formatted text.

This is useful for the creator.

Do not overbuild.

---

## 5. Market Simulation

Use local fake market data.

No real APIs.

Simple random walk is enough.

Each entity/index should have:
- base price;
- current price;
- history array;
- volatility;
- trend bias;
- headline;
- optional event sensitivity.

Suggested behaviors:
- EXEX: high price, medium volatility, slightly positive trend.
- OPSEC: high volatility, rises during conflict/security events.
- UNICOL: low price/credibility, unstable, mostly negative.
- PSA: low, unstable, political noise.
- PXB-X: volatile commodity-like movement.
- OCI: rises when things get worse.
- ACSB: defense-tech growth, positive during escalation.

Update every 2–4 seconds.

Keep motion subtle enough to be readable.

---

## 6. Optional Event System

A simple random event layer can make the dashboard feel alive.

Events should update:
- headlines;
- relevant ticker movement;
- status pills;
- media feed.

Example events:

### UNICOL Post 12-B loses contact
Effects:
- UNICOL down;
- OPSEC up;
- OCI up;
- EXEX slightly down or neutral;
- public visibility up.

### EXEX secures disputed extraction corridor
Effects:
- EXEX up;
- PXB-X up;
- PSA down.

### Thermal footage leaks from civilian corridor
Effects:
- EXEX down;
- UNICOL down;
- OCI up;
- public visibility up;
- legal exposure up.

### OPSEC announces new frontier security contracts
Effects:
- OPSEC up;
- ACSB up.

### Proxima stellar flare disrupts relay windows
Effects:
- all entities more volatile;
- OCI up;
- PXB-X volatile;
- signal quality degraded.

### PSA issues emergency directive
Effects:
- PSA briefly up or down depending on interpretation;
- EXEX legal exposure up;
- UNICOL headline activity up.

---

## 7. Design Requirements

Make it grounded.

The best target:
Apple Stocks + Reuters/Bloomberg-lite + internal corporate dashboard.

Do not make it a sci-fi cockpit.

Use:
- dark UI;
- clean cards;
- small sparklines;
- restrained green/red;
- amber warnings;
- subtle dividers;
- compact labels;
- serious typography.

Avoid:
- holograms;
- glowing hexagons;
- fake hacker UI;
- huge neon borders;
- overdesigned HUD panels;
- generic cyberpunk.

The horror should come from the content, not the ornament.

---

## 8. Suggested Components

src/
  data/
    entities.ts
    events.ts
    media.ts
  content/
    markdownLoader.ts
  components/
    AppShell.tsx
    MarketDashboard.tsx
    TickerCard.tsx
    MiniChart.tsx
    EntityDetail.tsx
    MediaFeed.tsx
    StatusPills.tsx
    DocumentViewer.tsx
  styles/
    app.css

If the app already exists, adapt to the existing structure.

Do not over-refactor.

---

## 9. Entity Set to Include First

Core:
- EXEX — Extraterrestrial Excavation
- OPSEC — Operational Security
- UNICOL — United Colonies
- PSA — Proxima Settlement Authority
- PXB-X — Proxima Resource Futures
- OCI — Outer Colony Insurance Index
- ACSB — Autonomous Combat Systems Basket

Optional placeholders:
- SYNOPTIC ORBITAL
- LUMEN RELAY
- HALCYON RISK
- DOMUS HABITAT SYSTEMS

Placeholders are allowed. They can be expanded later.

---

## 10. Success Criteria

The site succeeds if:

1. Opening the page immediately feels like entering the CORPORATE universe.
2. It looks more like a finance/news interface than a sci-fi HUD.
3. Tickers move over time.
4. Headlines rotate or update.
5. Clicking an entity opens a useful card/detail view.
6. EXEX, OPSEC, UNICOL, and PSA feel distinct.
7. The lore lives in editable files.
8. Updating lore files is easy.
9. The site works as a personal inspiration/mood piece.
10. It makes the world feel larger through text, dashboards, and market/media signals.

---

## 11. Recommended Codex Task

If asking a coding agent to implement the file-driven approach, use this goal:

Update the CORPORATE Codex site so lore is stored in local markdown files under content/corporate, while market behavior remains in structured local TypeScript data. Add a simple document viewer and connect entity detail pages to relevant excerpts. Preserve the grounded Apple Stocks / Reuters-lite visual tone. Do not add a backend or external APIs.

