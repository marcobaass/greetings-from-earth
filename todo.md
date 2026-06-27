# Greetings from Earth — TODO

`- [ ]` not started · `- [x]` done

---

## Done — Foundation & placement preview

- [x] BGA project, SFTP, TypeScript build pipeline
- [x] Server: `TILE_SHAPES`, `BERLIN_MAP`, `DICE_WHEEL`, states, DB tables
- [x] Client boards: map, 18×13 grid, dice wheel per player
- [x] `PlaceTile`: tile buttons, `tileSelected`, grid click → anchor
- [x] `tiles.ts`: `getShapeCells`, `applyRotation`, `applyMirror`, `effectiveRotation`
- [x] CSS cell preview (`showPreview` / `cleanUpPreview`)
- [x] Preview at (0,0) on tile select; move on grid click
- [x] Rotate ↻ / ↺ and mirror ↔ (status bar)
- [x] Auto-slide off-grid tiles (`isInsideGrid`, `computeTileShift`)
- [x] `onLeavingState` cleanup; `removeActionButtons()`; no duplicate listeners

---

## Next — Confirm & server smoke test

- [ ] Add Confirm button (grid does not submit)
- [ ] Confirm → `performAction('actPlaceTile', { activePlayerId, tileType, x, y, rotation, mirror })`
- [ ] `Game::placeTile()` stub: insert into `player_cells` (no validation yet)
- [ ] `notif_tilePlaced`: highlight cells on correct board
- [ ] Build → SFTP → test full flow in training mode

---

## Later — validation & polish

- [ ] Port rotation/mirror helpers to PHP (same order: rotate → mirror, `effectiveRotation` rule)
- [ ] Client validation: overlap, rivers, monuments, S-Bahn, adjacency
- [ ] Green/red preview OR disable Confirm when invalid
- [ ] `onPlayerActivationChange(false)`: cleanup when deactivated after submit
- [ ] `setup()`: render `gamedatas.coveredCells` on F5 reload

---

## Later — SVG & UX

- [ ] SVG preview overlay (replace or layer on CSS cells)
- [ ] Optional: ring controls on board (Ark Nova style)
- [ ] Optional: keyboard R / M / Enter

---

## Later — game logic

- [ ] `Game::isValidPlacement()` + reject with `UserException`
- [ ] `checkCollectibles()`, `PlaceBonus` UI, scoring, more maps

---

## Current step

**Next:** Confirm button + `performAction` (no full validation yet)