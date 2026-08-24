import { PlaceTile } from "./States/PlaceTile";
import { PlaceBonus } from "./States/PlaceBonus";
import { getShapeCells, cellsToOutlinePath } from "./tiles";

export class Game {
  public bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>;
  private gamedatas: GreetingsFromEarthGamedatas;

  private placeTile: PlaceTile;
  private placeBonus: PlaceBonus;

  constructor(bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>) {
    console.log("greetingsfromearth constructor");
    this.bga = bga;

    // Register state classes — names must match PHP state class names
    this.placeTile = new PlaceTile(this, bga);
    this.placeBonus = new PlaceBonus(this, bga);

    this.bga.states.register("PlaceTile", this.placeTile);
    this.bga.states.register("PlaceBonus", this.placeBonus);
  }

  // ===== RENDERING =====

  private renderRoundTracker(playerId: number, round: number) {
    const roundTracker = document.getElementById(`gfe-round-tracker-${playerId}`);
    if (!roundTracker || round === 0) return;

    const ROUNDS_POSITIONS = [
      { top: 55.2, left: 1.2 },
      { top: 45.2, left: 8.1 },
      { top: 37.2, left: 15.2 },
      { top: 45.2, left: 24 },
      { top: 48, left: 30.6 },
      { top: 50, left: 37 },
      { top: 51.8, left: 43 },
      { top: 25.3, left: 52.2 },
      { top: 17, left: 58.6 },
      { top: 8.7, left: 65.3 },
      { top: 2.7, left: 71.3 },
      { top: 3.7, left: 79.3 },
      { top: 14.5, left: 85.6 },
      { top: 26.9, left: 91.9 }
    ];

    roundTracker.innerHTML = "";

    for (let i = 0; i < round; i++) {
      roundTracker.innerHTML += `<div class="gfe-round-tracker-circle" style="top: ${ROUNDS_POSITIONS[i].top}%; left: ${ROUNDS_POSITIONS[i].left}%"></div>`;
    }
  }

  private renderCoveredCells(playerId: number, coveredCells: GreetingsFromEarthGamedatas["coveredCells"]) {
    const grid = document.getElementById(`gfe-play-grid-${playerId}`);
    if (!grid) return;

    const cells: { x: number; y: number }[] = Array.isArray(coveredCells) ? coveredCells : Object.values(coveredCells);

    for (const { x, y } of cells) {
      grid.querySelector(`.gfe-cell[data-x="${x}"][data-y="${y}"]`)?.classList.add("gfe-cell-placed");
    }
  }

  private renderMonumentCollectionTrack(
    playerId: number,
    monumentCount: number,
    collectionCount: number,
    monumentScore: number,
    collectionScore: number,
    monumentCollectionScore: number
  ): void {
    const track = document.getElementById(`gfe-monument-collection-track-${playerId}`);
    if (!track) return;

    const monumentScoreString = monumentScore.toString();
    const collectionScoreString = collectionScore.toString();
    const monumentCollectionScoreString = monumentCollectionScore.toString();

    track.innerHTML = "";

    for (let i = 0; i < monumentCount; i++) {
      track.innerHTML += `<div class="gfe-monument-track-circle" data-index="${i}" style="top: ${17.4 + i * 0.56}%; left: ${11.3 + i * 10.86}%"></div>`;
    }

    track.innerHTML += `<div class="gfe-monument-score"><p class="gfe-track-score">${monumentScoreString}</p></div>`;

    for (let i = 0; i < collectionCount; i++) {
      track.innerHTML += `<div class="gfe-collection-track-circle" data-index="${i}" style="top: ${55 + i * 0.515}%; left: ${11.2 + i * 7.8}%"></div>`;
    }

    track.innerHTML += `<div class="gfe-collection-score"><p class="gfe-track-score">${collectionScoreString}</p></div>`;

    track.innerHTML += `<div class="gfe-monument-collection-score"><p class="gfe-track-score">${monumentCollectionScoreString}</p></div>`;
  }

  private renderMustSeeUfoTrack(
    playerId: number,
    ufoCount: number,
    mustseeCount: number,
    mustseeScore: number,
    ufoScore: number,
    monumentCollectionScore: number,
    streetArtScore: number
  ): void {
    const track = document.getElementById(`gfe-ufo-mustsee-track-${playerId}`);
    if (!track) return;

    const mustseeScoreString = mustseeScore.toString();
    const ufoScoreString = ufoScore.toString();
    const monumentCollectionScoreString = monumentCollectionScore.toString();
    const streetArtScoreString = streetArtScore.toString();

    track.innerHTML = "";

    for (let i = 0; i < mustseeCount; i++) {
      const pair = Math.floor(i / 2);
      const top = i % 2 === 0 ? 11.9 + pair * -1.7 : 29.2 + pair * -0.35;
      const left = (i % 2 === 0 ? 14.5 : 19.7) + pair * 10.2;
      track.innerHTML += `<div class="gfe-mustsee-track-circle" data-index="${i}" style="top: ${top}%; left: ${left}%"></div>`;
    }

    track.innerHTML += `<div class="gfe-mustsee-score"><p class="gfe-track-score-orange">${mustseeScoreString}</p></div>`;

    for (let i = 0; i < ufoCount; i++) {
      track.innerHTML += `<div class="gfe-ufo-track-circle" data-index="${i}" style="top: ${59 + i * -0.315}%; left: ${15.2 + i * 9.8}%"></div>`;
    }

    track.innerHTML += `<div class="gfe-ufo-score"><p class="gfe-track-score-orange">${ufoScoreString}</p></div>`;

    track.innerHTML += `<div class="gfe-total-score"><p class="gfe-track-score-gray">${Number(ufoScoreString) + Number(mustseeScoreString) + Number(monumentCollectionScoreString) + Number(streetArtScoreString)}</p></div>`;
  }

  private renderStreetArtTrack(playerId: number, completedKeys: string[], streetArtScore: number) {
    const streetArtGridEl = document.getElementById(`gfe-street-art-choose-${playerId}`);
    const streetArtScoreEl = document.getElementById(`gfe-street-art-score-${playerId}`);
    if (!streetArtGridEl) return;

    const streetArtScoreString = streetArtScore.toString();

    for (const cell of completedKeys) {
      const [x, y] = cell.split(",");
      if (isNaN(Number(x)) || isNaN(Number(y))) continue;

      const cellEl = streetArtGridEl.querySelector(`.gfe-street-art-choose-cell[data-x="${Number(x)}"][data-y="${Number(y)}"]`);
      if (cellEl) {
        cellEl.classList.add("gfe-street-art-marked");
      }
    }

    if (streetArtScoreEl) {
      streetArtScoreEl.innerHTML = `<p class="gfe-track-score-blue">${streetArtScoreString}</p>`;
    }
  }

  private drawTileOnSVG(
    playerId: number,
    tileType: string,
    anchorX: number,
    anchorY: number,
    rotation: number,
    mirror: boolean,
    isLastTile: boolean = false
  ) {
    const tilesLayerEl = document.getElementById(`gfe-tiles-layer-${playerId}`);
    if (!tilesLayerEl) return;

    const cells = getShapeCells(tileType, anchorX, anchorY, rotation, mirror);

    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("gfe-tile");
    // optional: data-tile-type, etc.

    cells.forEach(([x, y]) => {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(x));
      rect.setAttribute("y", String(y));
      rect.setAttribute("width", "1");
      rect.setAttribute("height", "1");
      rect.classList.add("gfe-tile-cell");
      group.appendChild(rect);
    });

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", cellsToOutlinePath(cells));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#1a1a1a");
    path.setAttribute("stroke-width", "0.08");
    path.classList.add("gfe-tile-outline");
    group.appendChild(path);

    tilesLayerEl.appendChild(group);

    if (isLastTile) {
      group.classList.add("gfe-tile-last");
    }
  }

  // ===== GAME SETUP =====

  // This is called when the game is setup
  setup(gamedatas: GreetingsFromEarthGamedatas) {
    console.log("Starting game setup", gamedatas);
    this.gamedatas = gamedatas;

    // Set up the game area
    this.bga.gameArea.getElement().insertAdjacentHTML(
      "beforeend",
      `
            <div id="gfe-game-area">
                <div id="gfe-round-info">
                    Round: <span id="gfe-round">${gamedatas.currentRound}</span> / 14
                </div>
                <div id="gfe-player-boards"></div>
            </div>
        `
    );

    // Set up player boards
    const myId = this.bga.players.getCurrentPlayerId();
    const orderedPlayerIds = [myId, ...gamedatas.playerorder.map((id) => Number(id)).filter((id) => id !== myId)];

    orderedPlayerIds.forEach((playerId) => {
      const player = gamedatas.players[playerId];
      if (!player) return;

      document.getElementById("gfe-player-boards").insertAdjacentHTML(
        "beforeend",
        `
                <div id="gfe-board-${playerId}" class="gfe-player-board">
                    <strong>${player.name}</strong>
                    <div id="gfe-sheet-${playerId}" class="gfe-sheet">
                        <div id="gfe-play-grid-${playerId}" class="gfe-play-grid"></div>

                        <!-- SVG layer for tiles -->
                        <svg id="gfe-tiles-layer-${playerId}" class="gfe-tiles-layer" viewBox="0 0 18 13" preserveAspectRatio="none">

                        </svg>

                        <div id="gfe-dice-roll-${playerId}" class="gfe-dice-indicator gfe-dice-${gamedatas.diceRoll}"></div>
                        <div id="gfe-monument-collection-track-${playerId}" class="gfe-monument-collection-track"></div>
                        <div id="gfe-ufo-mustsee-track-${playerId}" class="gfe-ufo-mustsee-track"></div>
                        <div id="gfe-street-art-score-${playerId}" class="gfe-street-art-score"></div>
                        <div id="gfe-street-art-choose-${playerId}" class="gfe-street-art-choose"></div>
                        <div id="gfe-round-tracker-${playerId}" class="gfe-round-tracker"></div>
                    </div>
                    
                </div>

            `
      );

      // Set up player's play grid
      const playGridEl = document.getElementById(`gfe-play-grid-${playerId}`);
      if (playGridEl) {
        let cellsHTML = "";
        for (let y = 0; y < 13; y++) {
          for (let x = 0; x < 18; x++) {
            cellsHTML += `<div class="gfe-cell" data-x="${x}" data-y="${y}"></div>`;
          }
        }
        playGridEl.innerHTML = cellsHTML;
      }

      // Set up street art grid
      const streetArtGridEl = document.getElementById(`gfe-street-art-choose-${playerId}`);
      if (streetArtGridEl) {
        let cellsHTML = "";
        for (let y = 0; y < 5; y++) {
          for (let x = 0; x < 4; x++) {
            cellsHTML += `<div class="gfe-street-art-choose-cell" data-x="${x}" data-y="${y}"></div>`;
          }
        }
        streetArtGridEl.innerHTML = cellsHTML;
      }
    });

    // Set up tracks and covered cells
    Object.keys(gamedatas.players).forEach((pId) => {
      this.renderRoundTracker(Number(pId), gamedatas.currentRound);
    });

    const placements = gamedatas.placements ?? [];
    const ps = gamedatas.playerState;

    for (const p of placements) {
      const isLast =
        Number(p.x) === Number(ps.last_x) &&
        Number(p.y) === Number(ps.last_y) &&
        p.tile_type === ps.last_tile_type &&
        Number(p.rotation) === Number(ps.last_rotation) &&
        Number(p.mirror) === Number(ps.last_mirror);
      this.drawTileOnSVG(myId, p.tile_type, Number(p.x), Number(p.y), Number(p.rotation), Number(p.mirror) === 1, isLast);
    }

    const monument = JSON.parse(String(gamedatas.playerState.monument_completed || "[]")) as string[];
    const streetArt = JSON.parse(String(gamedatas.playerState.street_art_completed || "[]")) as string[];

    this.renderStreetArtTrack(myId, streetArt, Number(gamedatas.playerState.street_art_score));

    this.renderMonumentCollectionTrack(
      myId,
      monument.length,
      Number(gamedatas.playerState.collection_count),
      Number(gamedatas.playerState.monument_score),
      Number(gamedatas.playerState.collection_score),
      Number(gamedatas.playerState.monument_collection_score)
    );
    const mustsee = JSON.parse(String(gamedatas.playerState.mustsee_completed || "[]")) as string[];
    this.renderMustSeeUfoTrack(
      myId,
      Number(gamedatas.playerState.ufo_count),
      mustsee.length,
      Number(gamedatas.playerState.mustsee_score),
      Number(gamedatas.playerState.ufo_score),
      Number(gamedatas.playerState.monument_collection_score),
      Number(gamedatas.playerState.street_art_score)
    );

    this.setupNotifications();
    console.log("Ending game setup");
  }

  setupNotifications() {
    console.log("notifications subscriptions setup");
    this.bga.notifications.setupPromiseNotifications({});
  }

  async notif_newRound(args: NotifNewRoundArgs) {
    console.log("New round:", args.round, "Dice roll:", args.dice_roll);
    this.placeTile.clearPendingTiles();
    this.placeTile.setCanUndo(false);
    this.bga.gameui.gamedatas.currentRound = args.round;
    Object.keys(this.bga.gameui.gamedatas.players).forEach((pId) => {
      this.renderRoundTracker(Number(pId), args.round);
    });
    const roundEl = document.getElementById("gfe-round");
    if (roundEl) roundEl.textContent = String(args.round);
  }

  // ===== Helper functions =====

  private continueAfterPlacement(playerId: number, streetArtPending: number, pendingTiles: string[], awaitingTurnConfirm: boolean = false) {
    const myId = this.bga.players.getCurrentPlayerId();
    if (playerId !== myId) return;

    const ps = this.bga.gameui.gamedatas.playerState;
    ps.pending_bonus_tiles = JSON.stringify(pendingTiles);
    ps.street_art_pending = streetArtPending;

    this.placeTile.setCanUndo(true);

    if (awaitingTurnConfirm) {
      this.placeTile.showConfirmEndTurn();
      return;
    }

    if (streetArtPending > 0) {
      this.placeTile.showStreetArtChoose();
      return;
    }
    if (pendingTiles.length > 0) {
      this.placeTile.showBonusButtons(pendingTiles);
      return;
    }
    this.placeTile.showConfirmEndTurn();
  }

  // ===== NOTIFICATIONS =====

  async notif_tilePlaced(args: NotifTilePlacedArgs) {
    document
      .getElementById(`gfe-tiles-layer-${args.player_id}`)
      ?.querySelectorAll(".gfe-tile-last")
      .forEach((el) => el.classList.remove("gfe-tile-last"));
    this.drawTileOnSVG(args.player_id, args.tile_type, args.x, args.y, args.rotation, args.mirror, true);

    const cells = getShapeCells(args.tile_type, args.x, args.y, args.rotation, args.mirror);

    // this.renderCoveredCells(
    //   args.player_id,
    //   cells.map(([x, y]) => ({ x, y, tile_type: args.tile_type }))
    // );

    const myId = this.bga.players.getCurrentPlayerId();

    if (args.player_id === myId) {
      const gamedatas = this.bga.gameui.gamedatas;

      cells.forEach(([x, y]) => {
        gamedatas.coveredCells.push({ x, y, tile_type: args.tile_type });
      });

      gamedatas.playerState.has_started = 1;
      gamedatas.playerState.last_x = args.x;
      gamedatas.playerState.last_y = args.y;
      gamedatas.playerState.last_tile_type = args.tile_type;
      gamedatas.playerState.last_rotation = args.rotation;
      gamedatas.playerState.last_mirror = args.mirror ? 1 : 0;
    }

    this.continueAfterPlacement(args.player_id, args.street_art_pending ?? 0, args.pending_tiles ?? [], !!args.awaiting_turn_confirm);
  }

  async notif_bonusTilePlaced(args: NotifTilePlacedArgs) {
    document
      .getElementById(`gfe-tiles-layer-${args.player_id}`)
      ?.querySelectorAll(".gfe-tile-last")
      .forEach((el) => el.classList.remove("gfe-tile-last"));
    this.drawTileOnSVG(args.player_id, args.tile_type, args.x, args.y, args.rotation, args.mirror, true);

    const cells = getShapeCells(args.tile_type, args.x, args.y, args.rotation, args.mirror);

    // this.renderCoveredCells(
    //   args.player_id,
    //   cells.map(([x, y]) => ({ x, y, tile_type: args.tile_type }))
    // );

    const myId = this.bga.players.getCurrentPlayerId();

    if (args.player_id === myId) {
      const gamedatas = this.bga.gameui.gamedatas;

      cells.forEach(([x, y]) => {
        gamedatas.coveredCells.push({ x, y, tile_type: args.tile_type });
      });

      gamedatas.playerState.has_started = 1;
      gamedatas.playerState.last_x = args.x;
      gamedatas.playerState.last_y = args.y;
      gamedatas.playerState.last_tile_type = args.tile_type;
      gamedatas.playerState.last_rotation = args.rotation;
      gamedatas.playerState.last_mirror = args.mirror ? 1 : 0;
    }

    this.continueAfterPlacement(args.player_id, args.street_art_pending ?? 0, args.pending_tiles ?? [], !!args.awaiting_turn_confirm);
  }

  async notif_streetArtChosen(args: NotifStreetArtChosenArgs) {
    const ps = this.bga.gameui.gamedatas.playerState;
    const mustsee = JSON.parse(String(ps.mustsee_completed || "[]")) as string[];

    if (args.player_id === this.bga.players.getCurrentPlayerId()) {
      this.bga.gameui.gamedatas.playerState.street_art_score = args.street_art_score;
      this.renderMustSeeUfoTrack(
        args.player_id,
        ps.ufo_count,
        mustsee.length,
        ps.mustsee_score,
        ps.ufo_score,
        ps.monument_collection_score,
        ps.street_art_score
      );
    }

    this.renderStreetArtTrack(args.player_id, args.street_art_completed, args.street_art_score);

    this.continueAfterPlacement(args.player_id, args.street_art_pending ?? 0, args.pending_tiles ?? [], !!args.awaiting_turn_confirm);
  }

  async notif_turnFinalized(args: NotifTurnFinalizedArgs) {
    const monument = Array.isArray(args.monument_completed)
      ? args.monument_completed
      : (JSON.parse(String(args.monument_completed || "[]")) as string[]);

    this.renderMonumentCollectionTrack(
      args.player_id,
      monument.length,
      args.collection_count,
      args.monument_score,
      args.collection_score,
      args.monument_collection_score
    );

    const mustsee = Array.isArray(args.mustsee_completed)
      ? args.mustsee_completed
      : (JSON.parse(String(args.mustsee_completed || "[]")) as string[]);

    this.renderMustSeeUfoTrack(
      args.player_id,
      args.ufo_count,
      mustsee.length,
      args.mustsee_score,
      args.ufo_score,
      args.monument_collection_score,
      args.street_art_score
    );
    // Only sync local gamedatas for yourself
    if (args.player_id === this.bga.players.getCurrentPlayerId()) {
      const ps = this.bga.gameui.gamedatas.playerState;
      ps.collection_count = args.collection_count;
      ps.collection_score = args.collection_score;
      ps.ufo_count = args.ufo_count;
      ps.ufo_score = args.ufo_score;
      ps.mustsee_completed = JSON.stringify(mustsee);
      ps.mustsee_score = args.mustsee_score;
      ps.monument_completed = JSON.stringify(monument);
      ps.monument_score = args.monument_score;
      ps.monument_collection_score = args.monument_collection_score;
      ps.street_art_score = args.street_art_score;
    }
  }

  async notif_turnUndone(args: NotifTurnUndoneArgs) {
    const playerId = args.player_id;
    const myId = this.bga.players.getCurrentPlayerId();
    const layer = document.getElementById(`gfe-tiles-layer-${playerId}`);
    if (layer) {
      layer.innerHTML = "";
    }

    // 2. if this is MY undo, refresh client memory (needed for legal placement)
    if (playerId === myId) {
      this.bga.gameui.gamedatas.coveredCells = args.coveredCells;
      this.bga.gameui.gamedatas.placements = args.placements;
      this.bga.gameui.gamedatas.playerState = args.playerState;
    }

    // 3. redraw remaining tiles (same loop as setup ~277–288)
    const ps = args.playerState;
    const placements = args.placements ?? [];
    for (const p of placements) {
      const isLast =
        Number(p.x) === Number(ps.last_x) &&
        Number(p.y) === Number(ps.last_y) &&
        p.tile_type === ps.last_tile_type &&
        Number(p.rotation) === Number(ps.last_rotation) &&
        Number(p.mirror) === Number(ps.last_mirror);
      this.drawTileOnSVG(playerId, p.tile_type, Number(p.x), Number(p.y), Number(p.rotation), Number(p.mirror) === 1, isLast);
    }

    // 4. if this is MY undo, reset UI back to “place a tile”
    if (playerId === myId) {
      const streetArt = JSON.parse(String(ps.street_art_completed || "[]")) as string[];
      this.renderStreetArtTrack(myId, streetArt, Number(ps.street_art_score));

      this.placeTile.resetAfterUndo();
    }
  }

  async notif_turnEnded(args: { player_id: number; player_name: string }) {
    if (args.player_id === this.bga.players.getCurrentPlayerId()) {
      this.placeTile.setCanUndo(false);
      this.placeTile.clearPendingTiles();
    }
  }
}
