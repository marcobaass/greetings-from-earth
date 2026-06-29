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
- [x] `dbmodel.sql`: `last_tile_type`, `last_rotation`, `last_mirror`
- [x] `types.d.ts`: `coveredCells`, `playerState` (single file in `src/ts/`)
- [x] `map.ts`: `BERLIN_MAP`, `getCellType`, `getSbahnCellSet`, `cellKey`
- [x] `placement.ts`: overlap, adjacency, `isPlacementLegal`
- [x] `PlaceTile`: `updateActionButtons`, ✔ only when legal
- [x] `placeTileArgs` on class; gamedatas via `this.bga.gameui.gamedatas`

---

## Next — server smoke test

- [ ] `Game::placeTile()`: insert into `player_cells`, update `player_state`
- [ ] `notif_tilePlaced`: render cells + update client `gamedatas.coveredCells`
- [ ] `Game::isValidPlacement()` on server (mirror client rules)
- [ ] Build → SFTP → test: pick tile → place next to S-Bahn → ✔ → submit

**Note:** ✔ only appears when placement is legal. First tile must be **orthogonally adjacent** to an S-Bahn cell: `(8,0)`, `(0,5)`, `(17,5)`, `(8,12)`. Preview at `(0,0)` is usually invalid — expected.

---

## Next — tile choice (core rule, from game start)

Each round the dice offers 2 polyomino options (`tileOptions`). Players may instead choose:

- [ ] **1-square tile** (alternative to dice options)
- [ ] **2-square tile** (alternative to dice options)

**Server**

- [ ] Extend `PlaceTile` / `NewRound` args: send 1- and 2-square types alongside dice pair
- [ ] Add shapes to `TILE_SHAPES` / constants if needed (single cell, domino)
- [ ] `actPlaceTile` accepts these types like any other tile

**Client**

- [ ] `updateActionButtons`: show 1- and 2-square buttons with dice options
- [ ] Preview, validation, and confirm work for small tiles

---

## Later — validation & polish

- [ ] Port rotation/mirror helpers to PHP (same order: rotate → mirror, `effectiveRotation` rule)
- [ ] Green/red preview when invalid (optional; auto-slide stays)
- [ ] `onPlayerActivationChange(false)`: cleanup when deactivated after submit
- [ ] `setup()`: render `gamedatas.coveredCells` on F5 reload

---

## Later — placement UX

- [ ] Valid-placement hint: highlight where a tile may legally touch (S-Bahn on first turn; last tile + S-Bahn later)
- [ ] SVG preview overlay (replace or layer on CSS cells)
- [ ] Optional: ring controls on board (Ark Nova style)
- [ ] Optional: keyboard R / M / Enter

---

## Later — game logic

- [ ] `checkCollectibles()`, `PlaceBonus` UI, scoring
- [ ] More maps / content

---

## Current step

**Next:** `Game::placeTile()` + `notif_tilePlaced` — end-to-end submit and persist cells. Then **1- and 2-square tile choice** (core rule every round).