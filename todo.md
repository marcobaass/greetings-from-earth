How to get:
  - player id = this.bga.players.getCurrentPlayerId()



# Greetings from Earth — TODO

`- [ ]` not started · `- [~]` in progress · `- [x]` done

---

## Phase 0 — Foundation (done)

- [x] BGA project, SFTP, TypeScript build pipeline
- [x] `TILE_SHAPES`, `BERLIN_MAP`, `DICE_WHEEL` in `constants.inc.php`
- [x] DB tables `player_cells`, `player_state`
- [x] States: `NewRound` → `PlaceTile` (multiactive) → `PlaceBonus` → `EndScore`
- [x] Client boards: Berlin map, 18×13 grid, dice wheel overlay per player
- [x] `PlaceTile`: dice frame update from `args.diceRoll`
- [x] `PlaceTile`: status bar buttons from `args.tileOptions`
- [x] `PlaceTile`: store selected tile in `tileSelected`

---

## Phase 1 — Dumb submit (smoke test)

- [x] Grid click on own board reads `data-x` / `data-y` as anchor
- [ ] Guard grid click if `tileSelected` is null
- [ ] Call `performAction('actPlaceTile', …)` with rot 0, mirror false
- [ ] Fix `removeActionButtons()` in `onPlayerActivationChange`
- [ ] `Game::placeTile()` stub: insert cells into `player_cells` (no validation yet)
- [ ] `notif_tilePlaced`: highlight covered cells on the correct board
- [ ] Build TS, SFTP sync, test full click → server → notification in training mode

---

## Phase 2 — Shape math (client)

- [ ] Port `TILE_SHAPES` to `src/ts/tiles.ts` (or shared constants module)
- [ ] `applyRotation(offsets, rotation)` — 0/90/180/270
- [ ] `applyMirror(offsets, mirror)` — flip horizontally
- [ ] `getShapeCells(tileType, anchorX, anchorY, rotation, mirror)` → `{x,y}[]`
- [ ] Mirror same helpers in PHP (`constants.inc.php` or `Game.php`)

---

## Phase 3 — Placement draft object

- [ ] Define `PlacementDraft` type: tileType, anchor, rotation, mirror, coveredCells, isValid
- [ ] `recomputeDraft(draft)` updates coveredCells from shape math
- [ ] Recompute draft on tile select, grid click, rotate, mirror
- [ ] Reset draft when entering / leaving `PlaceTile`

---

## Phase 4 — Client validation (preview feedback)

- [ ] Port `BERLIN_MAP` cell types to client
- [ ] Check all shape cells are inside 18×13 bounds
- [ ] Check no overlap with `gamedatas.coveredCells` and already-rendered tiles
- [ ] Check no cell covers river, monument, or S-Bahn
- [ ] Check adjacency to last tile (or S-Bahn for first placement)
- [ ] Set `draft.isValid` and optional invalid reason for UI

---

## Phase 5 — SVG preview (anchor = top-left)

- [ ] Add preview container overlay on `gfe-sheet` (absolute, same scale as grid)
- [ ] Load / inline SVG per tile type (`I4`, `U5`, `L4`, `T4`, `SZ4`, `L5`)
- [ ] Position preview so anchor cell `(0,0)` aligns with `draft.anchor` on grid
- [ ] Move preview when player clicks a new grid cell
- [ ] Update preview transform on rotate / mirror
- [ ] Tint preview green when valid, red when invalid

---

## Phase 6 — Transform & confirm controls

- [ ] Grid click moves preview only — does not submit
- [ ] Add Rotate left / Rotate right buttons (update `draft.rotation`)
- [ ] Add Mirror button (toggle `draft.mirror`)
- [ ] Add Confirm button — enabled only when `draft.isValid`
- [ ] Confirm calls `performAction('actPlaceTile', …)` with full draft params
- [ ] Optional: keyboard shortcuts R / M / Enter
- [ ] Optional: Ark Nova-style ring around shape with buttons on ring

---

## Phase 7 — Cleanup & polish

- [ ] `onLeavingState`: remove grid listener, hide preview, clear draft
- [ ] `onLeavingState`: `removeActionButtons()`
- [ ] Prevent duplicate listeners when re-entering state
- [ ] Non-active players: no grid interaction, only watch notifications
- [ ] `setup()`: render existing `coveredCells` from `gamedatas` on F5 reload

---

## Phase 8 — Server validation (match client rules)

- [ ] `Game::isValidPlacement()` — bounds, overlap, non-coverable cells, adjacency
- [ ] `Game::placeTile()` calls `isValidPlacement()` before DB insert
- [ ] Update `player_state.last_x` / `last_y` after placement
- [ ] Reject invalid `actPlaceTile` with `UserException`

---

## Phase 9 — After placement works

- [ ] `checkCollectibles()` on newly covered cells
- [ ] `PlaceBonus` client UI (reuse draft + preview flow)
- [ ] Scoring panel and end-game scoring
- [ ] Additional maps (Paris, London, New York)

---

## Current step

**Next:** Phase 1 — grid click on own board + `performAction` smoke test
