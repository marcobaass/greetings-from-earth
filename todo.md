# Greetings from Earth — BGA Implementation TODO

## Legend
- [ ] Not started
- [~] In progress
- [x] Done

---

## 1. Project Setup
- [x] Register game on BGA Studio (`greetingsfromearth`)
- [x] Set up Cursor with SFTP sync
- [x] SSH key configured
- [x] `package.json` with TypeScript, SCSS, Prettier
- [x] Init git repo + `.gitignore`
- [x] Do initial SFTP download and verify project files

---

## 2. Static Game Data (`modules/php/constants.inc.php`)
- [x] Cell type constants
- [x] Tile type constants
- [x] Dice wheel mapping (roll → two tile options)
- [x] Tile shapes as coordinate offsets
- [x] Berlin map grid (18×13)
- [x] Berlin must-see clusters (A–I)
- [x] Berlin must-see scoring track
- [x] Berlin monument scoring track
- [x] Berlin collection ball scoring track
- [x] Berlin S-Bahn start positions
- [ ] Tile rotation/mirror helper functions (generate all variants of a shape)

---

## 3. Database (`dbmodel.sql`)
- [x] `player_cells` — cells covered per player
- [x] `player_state` — per-player progress and collected items
- [x] `game_state` — shared key/value store
- [ ] Revisit `game_state` vs BGA built-in globals once state machine is designed

---

## 4. Game Info & Configuration
- [x] `gameinfos.inc.php` — game metadata (name, players, description)
- [ ] Revisit `gameinfos.inc.php` when bgg ids
- [ ] `gameoptions.inc.php` — map selection option (berlin, paris, london, new york)
- [ ] `stats.inc.php` — define end-game statistics (score breakdown per category)

---

## 5. State Machine (`states.inc.php`)
Define all game states and transitions:
- [ ] `ST_GAME_SETUP` — initialize board, deal starting positions
- [ ] `ST_NEW_ROUND` — increment round counter, roll dice, broadcast tile options
- [ ] `ST_PLAYER_PLACE_TILE` — multiactive: all players choose tile + placement
- [ ] `ST_PLAYER_PLACE_BONUS` — multiactive: player places pending bonus tile(s) if any
- [ ] `ST_CHECK_ROUND_END` — all players submitted? → next round or end game
- [ ] `ST_END_GAME` — trigger final scoring

---

## 6. Server-Side Game Logic (`Game.php`)

### Setup
- [ ] `setupNewGame()` — create `player_state` rows, initialize `game_state`
- [ ] Choose starting S-Bahn adjacency (first tile must be adjacent to an S-Bahn)

### Round flow
- [ ] `rollDice()` — roll d6, store result, derive two tile options from dice wheel
- [ ] `getTileOptions(int $roll): array` — return two tile type strings

### Tile placement validation
- [ ] `isValidPlacement(int $playerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): bool`
  - [ ] All cells of the tile must be within grid bounds
  - [ ] No cell overlaps an already-covered cell
  - [ ] No cell covers a non-coverable cell (river, monument, S-Bahn)
  - [ ] At least one cell is orthogonally adjacent to the player's last placed tile
  - [ ] Exception: first tile must be adjacent to any S-Bahn station

### Tile placement execution
- [ ] `placeTile(int $playerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): void`
  - [ ] Insert rows into `player_cells`
  - [ ] Update `last_x`, `last_y` in `player_state`
  - [ ] Call `checkCollectibles()` for each newly covered cell

### Collectible resolution
- [ ] `checkCollectibles(int $playerId, array $coveredCells): void`
  - [ ] Currywurst → add 2-tile to `pending_bonus_tiles`
  - [ ] eScooter → add 4-tile to `pending_bonus_tiles`
  - [ ] UFO → increment `ufo_count`
  - [ ] Collection ball → increment `collection_count`
  - [ ] Street art → increment `street_art_progress`, unlock bonus tile if threshold reached
  - [ ] Must-see → call `checkMustSeeClusters()`
  - [ ] Monument adjacency → call `checkMonuments()`

### Must-see cluster checking
- [ ] `checkMustSeeClusters(int $playerId): void`
  - [ ] For each cluster, check if all cells are in `player_cells`
  - [ ] If newly completed, add to `mustsee_completed`

### Monument checking
- [ ] `checkMonuments(int $playerId): void`
  - [ ] For each monument, check if all orthogonal neighbours are covered/blocked
  - [ ] If newly surrounded, increment `monument_count`

### Bonus tile placement
- [ ] `hasPendingBonusTiles(int $playerId): bool`
- [ ] `placeBonusTile(int $playerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): void`
  - [ ] Same validation as regular tile placement
  - [ ] Remove from `pending_bonus_tiles`

### End-game scoring
- [ ] `scoreMonuments(int $playerId): int` — use `BERLIN_MONUMENT_SCORES` track
- [ ] `scoreCollectionBalls(int $playerId): int` — use `BERLIN_COLLECTION_SCORES` track
- [ ] `scoreMustSees(int $playerId): int` — use `BERLIN_MUSTSEE_SCORES` track
- [ ] `scoreUfos(int $playerId): int` — TBD (need scoring rule)
- [ ] `scoreStreetArt(int $playerId): int` — sum of circled street art chain values
- [ ] `scoreFinalGame(): void` — sum all categories, update BGA scores, trigger game end

---

## 7. Player Actions (`greetingsfromearth.action.php`)
- [ ] `placeTile()` — receive tile type, x, y, rotation, mirror from client
- [ ] `placeBonusTile()` — receive bonus tile placement from client
- [ ] Input sanitization and validation for all actions

---

## 8. Client-Side Interface (`modules/ts/Game.ts` / `Game.js`)

### Board rendering
- [ ] Render 18×13 Berlin grid as HTML/CSS cells
- [ ] Overlay SVG map artwork as background image
- [ ] Render cell highlights (valid placement zones) on hover
- [ ] Render covered cells (player tile drawings)
- [ ] Show all player boards simultaneously (scrollable for high player counts)

### Tile placement UI
- [ ] Show two tile options for current round
- [ ] Tile preview — follows cursor on the grid
- [ ] Rotate tile (keyboard shortcut R)
- [ ] Mirror tile (keyboard shortcut M or F)
- [ ] Highlight valid placement cells in green, invalid in red
- [ ] Click to confirm placement
- [ ] Bonus tile placement flow (same UI, triggered after main tile)

### Round display
- [ ] Show current round (1–14) and dice roll result
- [ ] Show dice wheel with current roll highlighted
- [ ] Animate dice roll

### Scoring panel
- [ ] Show per-player: monuments surrounded, collection balls, must-sees, UFOs, street art
- [ ] Update live as players place tiles
- [ ] Final score breakdown at game end

### Notifications
- [ ] Tile placed by player X
- [ ] Collectible collected
- [ ] Must-see cluster completed
- [ ] Monument surrounded
- [ ] Bonus tile earned
- [ ] Round started (new dice roll)
- [ ] Game ended

---

## 9. CSS / SCSS (`src/scss/Game.scss`)
- [ ] Grid layout and cell sizing
- [ ] Cell type colours (river, must-see, etc.)
- [ ] Tile preview overlay styles
- [ ] Valid/invalid placement highlight styles
- [ ] Player board panel styles
- [ ] Scoring panel styles
- [ ] Responsive layout for many players

---

## 10. Translations (`greetingsfromearth_greetingsfromearth.tpl` + lang files)
- [ ] All notification messages
- [ ] UI labels (tile names, scoring categories)
- [ ] German translation (your native language — good starting point)
- [ ] English translation (required for BGA)

---

## 11. Testing
- [ ] Test full 14-round game solo (training mode)
- [ ] Test 2-player simultaneous placement
- [ ] Test all collectible types trigger correctly
- [ ] Test must-see cluster completion detection
- [ ] Test monument surrounding detection
- [ ] Test bonus tile placement flow
- [ ] Test end-game scoring totals
- [ ] Test edge cases: tile placement at grid edges, no valid moves

---

## 12. Additional Maps (after Berlin is complete)
- [ ] Paris map grid + special rules (wine, baguette, cheese, UFO, metro)
- [ ] New York map grid + special rules (skyscrapers, culinary guide, taxis)
- [ ] London map grid + special rules (Thames start, backpack, buses, taxis)
- [ ] Map selection in game options
- [ ] Per-map scoring panels in UI

---

## 13. BGA Submission
- [ ] Game passes BGA peer review checklist
- [ ] All required translations present
- [ ] Game thumbnail and screenshots uploaded
- [ ] BGG ID updated once game is listed
- [ ] Submit for BGA alpha review

---

## Current Status
**Next step:** `gameinfos.inc.php` and `states.inc.php`
