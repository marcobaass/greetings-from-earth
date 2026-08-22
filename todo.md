> Rules reference: see `Rules_A4.pdf` (and optionally summarize key scoring rules in `gamerules.md`).

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
- [x] `TileHelper.php`: PHP `getShapeCells` (matches `tiles.ts`)
- [x] `actPlaceTile`: `$currentPlayerId` magic param (`PlaceTile.php`, `PlaceBonus.php`)

---

## Next — server smoke test

- [x] `Game::placeTile()`: insert into `player_cells`, update `player_state`
- [x] `notif_tilePlaced`: render cells + update client `gamedatas.coveredCells`
- [x] `Game::isValidPlacement()` on server (mirror client rules)
- [x] Build → SFTP → test: pick tile → place next to S-Bahn → ✔ → submit

**Note:** ✔ only appears when placement is legal. First tile must be **orthogonally adjacent** to an S-Bahn cell: `(8,0)`, `(0,5)`, `(17,5)`, `(8,12)`. Preview at `(0,0)` is usually invalid — expected.

---

## Next — tile choice (core rule, from game start)

Each round the dice offers 2 polyomino options (`tileOptions`). Players may instead choose:

- [x] **1-square tile** (alternative to dice options)
- [x] **2-square tile** (alternative to dice options)

**Server**

- [x] Extend `PlaceTile` / `NewRound` args: send 1- and 2-square types alongside dice pair
- [x] Add shapes to `TILE_SHAPES` / constants if needed (single cell, domino)
- [x] `actPlaceTile` accepts these types like any other tile

**Client**

- [x] `updateActionButtons`: show 1- and 2-square buttons with dice options
- [x] Preview, validation, and confirm work for small tiles

---

## Later — validation & polish

- [x] Port rotation/mirror helpers to PHP (same order: rotate → mirror, `effectiveRotation` rule)
- [x] Green/red preview when invalid (optional; auto-slide stays)
- [x] `onPlayerActivationChange(false)`: cleanup when deactivated after submit
- [x] `setup()`: render `gamedatas.coveredCells` on F5 reload

---

## Later — game logic

- [x] Collection balls: end-of-turn scoring, circles, live score updates
- [x] Bonus tiles: triggers, server + client (currywurst, e-scooter)
- [x] UFO scoring
- [x] Must-see clusters: server `checkMustSeeClusters`, scoring track, client zig-zag UI, `turnFinalized` for all players
- [x] Monument surround scoring
- [x] calculation of monument/collection score -> total score added to player score is monument score \* collection score
- [x] UI show monument/collection score and total score on sheet
- [x] Street art / graffiti scoring
- [x] Street art score on sheet
- [x] Circles on street art track
- [x] Roundtracker top of sheet
- [x] Live score update on sheet
- [x] Indicator for square on tiles where to place
- [x] SVGs also on Buttons
- [x] Last tile placed differently colored
- [x] Better visible where to place and where forbidden
- [x] implement 'undo' (turn snapshot + Done/Undo after place)
- [x] End Scoring
- [ ] Circles for Roundtracker on other players board don't show on players board
- [ ] diffrent player sheet on top than actuall player
- [ ] single and two square tiles also as alternative for bonus tiles
- [ ] layout shift through buttons top
- [ ] prevent hover on street art track and board grid when no streetart to select or no tile for the board choosen

## Later — placement UX

- [?] Valid-placement hint: highlight where a tile may legally touch (S-Bahn on first turn; last tile + S-Bahn later)
- [ ] tile on mouse first?
- [x] SVG preview overlay (replace or layer on CSS cells)
- [ ] SVG scribbled circles on tracks and streetart
- [ ] animations for circles
- [ ] ring controls on board (Ark Nova style)
- [?] Soundeffects
- [ ] Hover Icons

---

---

## Next — bonus tiles

- [x] placement circles on monuments. Shift to collection track.
- [x] Server: trigger bonus when covering currywurst / e-scooter
  - [x] Append tile ids (e.g. `I1`, `I2`) to `pending_bonus_tiles`
- [x] Server: implement `placeBonusTile` in `Game.php`
  - [x] Validate placement (reuse `isValidPlacement`)
  - [x] Insert into `player_cells`, update `last_*`
  - [x] Remove one tile from `pending_bonus_tiles`
  - [x] Call `addCellsThisTurn` for bonus cells
- [x] Flow: in `PlaceBonus`, call `finalizeTurn` when `hasPendingBonusTiles` becomes false
- [x] Client: `PlaceBonus.ts` UI
  - [x] Show `pendingTiles` as buttons
  - [x] Reuse grid preview / rotate / mirror
  - [x] Call `actPlaceBonusTile`
- [x] Client: `notif_bonusTilePlaced` renders tiles like `notif_tilePlaced`
