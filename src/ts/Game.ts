import { PlaceTile } from "./States/PlaceTile";
import { PlaceBonus } from "./States/PlaceBonus";
import { getShapeCells } from "./tiles";

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

  private renderMustSeeUfoTrack(playerId: number, ufoCount: number, mustseeCount: number, mustseeScore: number, ufoScore: number): void {
    const track = document.getElementById(`gfe-ufo-mustsee-track-${playerId}`);
    if (!track) return;

    const mustseeScoreString = mustseeScore.toString();
    const ufoScoreString = ufoScore.toString();

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
    Object.entries(gamedatas.players).forEach(([pId, player]) => {
      const playerId = Number(pId);
      document.getElementById("gfe-player-boards").insertAdjacentHTML(
        "beforeend",
        `
                <div id="gfe-board-${playerId}" class="gfe-player-board">
                    <strong>${player.name}</strong>
                    <div id="gfe-sheet-${playerId}" class="gfe-sheet">
                        <div id="gfe-play-grid-${playerId}" class="gfe-play-grid"></div>
                        <div id="gfe-dice-roll-${playerId}" class="gfe-dice-indicator gfe-dice-${gamedatas.diceRoll}"></div>
                        <div id="gfe-monument-collection-track-${playerId}" class="gfe-monument-collection-track"></div>
                        <div id="gfe-ufo-mustsee-track-${playerId}" class="gfe-ufo-mustsee-track"></div>
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
    });

    // Set up tracks and covered cells

    const myId = this.bga.players.getCurrentPlayerId();

    this.renderCoveredCells(myId, gamedatas.coveredCells);
    const monument = JSON.parse(String(gamedatas.playerState.monument_completed || "[]")) as string[];
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
      Number(gamedatas.playerState.ufo_score)
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
    const roundEl = document.getElementById("gfe-round");
    if (roundEl) roundEl.textContent = String(args.round);
  }

  async notif_tilePlaced(args: NotifTilePlacedArgs) {
    const cells = getShapeCells(args.tile_type, args.x, args.y, args.rotation, args.mirror);

    this.renderCoveredCells(
      args.player_id,
      cells.map(([x, y]) => ({ x, y, tile_type: args.tile_type }))
    );

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

    if (args.player_id === myId && args.pending_tiles && args.pending_tiles.length > 0) {
      this.placeTile.showBonusButtons(args.pending_tiles);
    } else if (args.player_id === myId) {
      this.placeTile.clearPendingTiles();
      this.bga.statusBar.removeActionButtons();
    }
  }

  async notif_bonusTilePlaced(args: NotifTilePlacedArgs) {
    const cells = getShapeCells(args.tile_type, args.x, args.y, args.rotation, args.mirror);

    this.renderCoveredCells(
      args.player_id,
      cells.map(([x, y]) => ({ x, y, tile_type: args.tile_type }))
    );

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

    if (args.player_id === myId && args.pending_tiles && args.pending_tiles.length > 0) {
      this.placeTile.showBonusButtons(args.pending_tiles);
    } else if (args.player_id === myId) {
      this.placeTile.clearPendingTiles();
      this.bga.statusBar.removeActionButtons();
    }
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

    this.renderMustSeeUfoTrack(args.player_id, args.ufo_count, mustsee.length, args.mustsee_score, args.ufo_score);
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
    }
  }
}
