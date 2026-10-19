# Washing-machine data (`data/washers/`)

The `washer-panel` widget (docs/spec.md 6 and 11.6) reads one file per machine:
`data/washers/<id>.json`, UTF-8, user-facing strings in Russian, an optional `en` block with
English. The format comes from washguide (washguide.ru), where the files were collected; keep the
two in sync when a machine is fixed in one place.

`id` is kebab-case latin `<brand>-<model>` and equals the file name. Every number from the manual
carries its page (`sourcePage`). Anything not taken from the manual is marked `"estimate": true`
or listed in `notes.assumptions`; what the manual lacks goes to `notes.gaps`. Never invent values.

## Top level

| Field | Meaning |
|---|---|
| `id`, `brand`, `model`, `aliases[]`, `years` | identity and search terms (Cyrillic and Latin) |
| `loading` | `front` or `top` |
| `capacityKg`, `maxSpinRpm`, `heaterW` | from the manual when stated |
| `summary`, `pitfalls[]` | one or two sentences; the confusing bits of the panel |
| `completeness: "partial"` | the manual found lacks key tables; the widget shows `notes.gaps` |
| `panel` | the drawing: `face` (plastic colour), `ink` (print colour), `rows`, `controls`, optional `programChangeWhenOff` |
| `tray` | the detergent drawer: `location`, `compartments[]` (`id`, `mark`, `use`, `label`, `width`), `help` |
| `cycle` | the timer walk: `steps[]`, `timerPausesForHeating`, `washLitres`, `inletTempC`, `estimate`, `dialMoves` |
| `programs[]` | the manual's programme table, keyed by programme knob position `pos` |
| `rules[]` | extra conflicts: `when` (`pos`, `options`, `fabric`, `tempAboveC`, `spinAboveRpm`), `check` (`tempMaxC`, `spinMaxRpm`, `forbidOptions`, `requireOptions`), `level`, `message` |
| `presets[]` | everyday scenarios: `id`, `title`, `group`, `set` (knob values by role or control id, option buttons), `dose`, `note`; the first one is the widget's default |
| `troubleshooting[]`, `care[]` | `title`, `causes[]` / `text`; guides take their faq from `troubleshooting` |
| `sources[]` | `title`, `url`, `kind` (`manufacturer`, `manual-archive`, `photo`, `forum`), `pages` |
| `notes` | `assumptions[]`, `gaps[]` |
| `en` | English overrides, see below |

## Controls

`panel.controls[]`: `id`, `type` (`knob`, `button`, `lamp`, `slider`), `role` (`program`,
`temperature`, `spin`, `power`, `option`, `start`), `label` (as printed), optional `name` (for
text when the label is a symbol), `symbol` (icon key), `help`.

- Knobs: `rotation` (`cw-only` or `free`), `pointer`, `positions[]` with `value`, `label`,
  `angle` (degrees clockwise from 12 o'clock), and per role `tempC`, `rpm` or `zone`; `stop: true`
  marks a stop dot, `timerOnly: true` a mark the timer passes by itself, `short` a shorter label,
  `symbol` an icon. `zones[]` colour arcs (`id`, `label`, `color`). `anglesEstimate: true` when the
  manual has no knob drawing.
- Sliders use `offset` (0..1) instead of `angle`.
- Option buttons may carry `effect`: `waterFactor`, `holdBeforeSpin`, `extraRinseMin`.
- Lamps: `color` (`red`, `green`, `orange`, `yellow`) and `lit` (`power`, `door`, `phase`, `heat`, ...).
- Symbols: `power`, `half-load`, `water-stop`, `no-spin`, `rinse`, `softener`, `prewash`, `eco`,
  `intensive`, `extra-rinse`, `door`, `snowflake`, `bleach`, `wool`, `delicate`, `drain`, `spin`, `start`.

## Cycle

`cycle.steps[]`: `pos`, `phase` (`prewash`, `wash`, `rinse`, `softener`, `spin`, `drain`, `soak`,
`pause`), `min` (timer minutes without heating), `minNoSpin`, `heats`, `maxHeatC`, `dose[]`
(compartment ids) and `end` (`stop`, `water-stop`, `drain`) on the last step. The walk starts at
the first step whose `pos` equals the programme knob and runs to the first `end`. Heating time is
added from `washLitres`, the temperature rise and `heaterW` when `timerPausesForHeating`.
`dialMoves: false` marks electronic control: the knob stays still, the steps are programme stages.

## English: `en`

Optional, field by field; Russian is the fallback. `summary`, `years`, `pitfalls[]` (same count),
`controls.<id>` (`help`, `name`, `label`, `zones`, `positions`), `tray` (`help`,
`compartments.<id>`), `programs.<pos>` (`name`, `note`), `rules[]` (messages), `presets.<id>`
(`title`, `note`, `dose`), `troubleshooting[]`, `care[]`, `notes`, `sources[]` (titles). Text printed
on the real panel stays as printed unless it is Russian words.

## Checks

`scripts/test/washer.test.mjs` runs the ported engine assertions on `indesit-wgs-834-txr` and sweeps
every programme and preset of every machine in both languages: no throws, no 0-minute or missing
cycles, no errors in presets, estimates within 35 % of the manual's durations.
