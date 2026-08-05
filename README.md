# text-token-generator

A Vite-powered Vue 3 + TypeScript browser app for generating printable text coins.

## Four-part coin generator

The first-version generator builds a coin as four separately named printable parts:

1. **Center cylinder**: the main coin body.
2. **Border ring**: the raised or colored perimeter detail.
3. **Top text insert**: the text geometry for the top face.
4. **Bottom text insert**: the text geometry for the bottom face.

Keeping these elements separate makes the preview and exported model easier to inspect, color, and validate in slicers that support multipart 3MF files.

## Local development

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Build the production app:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Run the test suite:

```bash
npm run test
```

Run TypeScript checks:

```bash
npm run typecheck
```

## Export Multipart 3MF

**Export Multipart 3MF** downloads a `.3mf` package that keeps the generated coin split into its four logical parts instead of flattening everything into one mesh. The export preserves part names and display colors so slicers can expose the body, border ring, top text, and bottom text as separate selectable objects/material assignments.

Use this export when checking whether a slicer can import the coin as a multipart model, retain object names, retain assigned colors/materials, and keep the parts aligned as one assembled coin.

## Phase 1 Snapmaker Orca acceptance checklist

Use this checklist to accept Phase 1 compatibility in Snapmaker Orca:

- The exported `.3mf` file opens without repair prompts or import errors.
- Snapmaker Orca shows four imported parts: center cylinder/body, border ring, top text, and bottom text.
- All four parts remain aligned in the correct coin assembly after import.
- Part names are visible or distinguishable in the object list.
- Assigned colors/material slots are retained or can be mapped per part.
- The top and bottom text are selectable independently from the body and border ring.
- Slicing succeeds after assigning materials/colors appropriate for the target printer.
- The sliced preview shows the intended dimensions, text depth, border placement, and face orientation.

## Supported first-version scope

The initial scope is intentionally focused:

- One text line per face.
- DejaVu Sans as the supported font.
- Browser-only operation with no server-side generation requirement.
- Adjustable colors, dimensions, and text depths.

## Deferred features

The following features are intentionally deferred from the first version:

- Multiple fonts.
- Multiline text.
- Curved text.
- Images and logos.
- CSV/batch generation.
- Snapmaker project settings.
- G-code generation.
