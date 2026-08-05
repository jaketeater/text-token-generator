# Poker Chip Generator

Browser-only Vue 3 + TypeScript app that generates a printable multipart 3MF poker chip with:

- Separately colored center body and full-thickness border ring
- Separately colored recessed top and bottom text
- Circle-aware multiline word wrapping
- Real-time 3D preview
- One assembled multipart 3MF for Snapmaker Orca

Geometry only is generated here. Filament assignment, slicing, and G-code stay in Snapmaker Orca.

## Local development

```bash
npm install
npm run dev
```

```bash
npm test
npm run build
```

DejaVu Sans is copied locally by `npm run load:font` (runs automatically before `dev`, `test`, and `build`).

## Export

Use **Export Multipart 3MF**. The package contains:

1. Coin Body
2. Border Ring
3. Top Text
4. Bottom Text

under one parent **Poker Chip** object.

### Phase 1 Snapmaker Orca checklist

- [ ] File opens without repair prompts
- [ ] One assembled object with four selectable parts
- [ ] Parts remain aligned
- [ ] Names and display colors are visible
- [ ] Each part can receive a different filament
- [ ] Slice succeeds without manually repositioning components

## Physical print checklist (Phase 7)

Print and inspect toolpaths for:

- [ ] Large top lettering
- [ ] Small bottom lettering
- [ ] Multiple wrapped lines
- [ ] Letters with counters (`O`, `B`, `8`)
- [ ] Short top/bottom lines
- [ ] Features near minimum printable stroke width
- [ ] Four distinct filament colors

## Scope

Included: browser-only generation, DejaVu Sans, adjustable dimensions, circle-aware wrap, shrink-to-fit, forced newlines, preview cameras, four-part 3MF.

Deferred: extra fonts, hyphenation, curved perimeter text, logos, CSV batch, STL, saved projects, embedded Snapmaker filament/G-code.
