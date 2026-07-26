---
name: ai-product-radar
description: Research, curate, and publish personalised Russian-language news digests about AI product development, coding agents, business analysis, product management, enterprise AI, internal tools, HRTech, EdTech, fintech, and innovation. Use when Ekaterina asks to collect recent news, create or refresh an AI Product Radar digest, investigate a topic, or update the local HTML news archive.
---

# AI Product Radar

Create an evidence-based digest that can replace reading most source articles. Work in `/Users/ekaterina/AI-Product-Radar`.

## Before research

1. Read `references/profile.md` completely.
2. Read `references/editorial-policy.md` completely.
3. Read `/Users/ekaterina/AI-Product-Radar/config/sources.json`.
4. Inspect `/Users/ekaterina/AI-Product-Radar/state/seen.json` and recent files in `data/digests/`.
5. Interpret an unspecified period as the time since the latest digest, capped at seven days. State the exact date range.

## Research

1. Search in Russian and English. Prefer primary sources: official announcements, documentation, changelogs, GitHub releases, research papers, and original engineering posts.
2. Cover every high-priority topic from the profile, but retain only material with a clear new fact or practical insight.
3. Open and read the full accessible source. Never summarise from a search snippet alone.
4. For an important claim, seek a second independent source or label it as the source's claim.
5. Resolve the publication date and, when different, the date the event occurred.
6. Reject duplicates, rewrites, generic opinion pieces, SEO collections, and marketing announcements without substance.
7. Compare canonical URLs, titles, event fingerprints, and `seen.json`. A meaningful update to an old story may be included as an update.

## Write the digest

Create `data/digests/YYYY-MM-DD[-topic].json` following `references/digest-schema.json`.

For each selected item:

- Write a 70–120 word overview.
- Write a 500–1,200 word detailed summary proportional to the source.
- Preserve important facts, numbers, examples, reasoning, limitations, and counterarguments.
- Separate source content from your inference.
- Explain why it matters specifically to Ekaterina.
- Suggest concrete applications to her products or work only when grounded.
- Set `read_original` to `false` when the summary substitutes for the article. If `true`, explain which diagram, table, demo, code sample, or nuance requires the original.
- Add source links supporting the summary. Do not reproduce copyrighted articles or long passages.

Rank items using the editorial policy. Aim for 5–12 strong items, not a fixed quota. It is acceptable to publish a short digest when little of value happened.

## Validate and publish

Run:

```bash
node scripts/validate-digest.mjs data/digests/<file>.json
node scripts/build-site.mjs
```

Fix every validation error. Confirm that:

- `public/index.html` was updated;
- `public/digests/<slug>.html` exists;
- `state/seen.json` includes the new canonical URLs;
- existing digest files remain unchanged.

Report the digest path, item count, date range, and the three strongest items. Do not create a Git commit, push, deploy, or send a notification unless the user explicitly asks.

