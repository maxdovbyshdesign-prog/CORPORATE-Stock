# Corporate Codex Market Feed

Local mood/codex site for CORPORATE. The app is frontend-only: no backend, no external APIs, no AI calls.

## Growing the Codex

1. Add or update actors, indexes, and institutions in `src/data/entities.ts`.
2. Add long-form lore in `content/corporate/*.md`.
3. Put reusable public language, report lines, quotes, and sample headlines into `CORPORATE_MEDIA_FRAGMENTS.md` or the entity notes.
4. Add or adjust relationships and sensitivities in entity data so generated events know who tends to affect whom.
5. Add new event shapes in `src/data/newsTemplates.ts` when a new kind of incident should move the market.
6. Check the Codex page's `Codex Atoms` panel to confirm markdown is being converted into usable short fragments.

The procedural feed is deliberately conservative. It extracts short lore atoms from markdown, combines them with structured templates, then applies local market and institution effects.
