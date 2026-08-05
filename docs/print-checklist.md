# Physical print testing checklist

Use this after the multipart 3MF imports cleanly into Snapmaker Orca.

## Before printing

1. Export a default coin and a wrapped multiline coin.
2. Assign four filaments: body, border, top text, bottom text.
3. Confirm top text is readable from above and bottom text from below after the chosen flip orientation.
4. Inspect toolpaths for thin strokes narrower than nozzle width; widen text or depth if needed.

## Suggested print set

| Sample | Top text | Bottom text | Notes |
| --- | --- | --- | --- |
| A | `TOKEN` | `TEXT TOKEN` | Defaults |
| B | `ONE TWO THREE FOUR` | `A BB CCC` | Wrapped lines |
| C | `O B 8` | `$10` | Counters / symbols |
| D | Short top line near border | Long phrase with shrink | Min stroke / shrink |

## Pass criteria

- No non-manifold / repair warnings on import
- Four colors appear where intended
- Text is recessed, not floating or overlapping body volume
- Bottom reading orientation matches the selected flip convention
