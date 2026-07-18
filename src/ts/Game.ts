import { PlaceTile } from "./States/PlaceTile";
import { PlaceBonus } from "./States/PlaceBonus";
import { getShapeCells } from "./tiles";

export class Game {
    public bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>;
    private gamedatas: GreetingsFromEarthGamedatas;

    private placeTile: PlaceTile;
    private placeBonus: PlaceBonus;

    constructor(bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>) {
        console.log('greetingsfromearth constructor');
        this.bga = bga;

        // Register state classes — names must match PHP state class names
        this.placeTile = new PlaceTile(this, bga);
        this.placeBonus = new PlaceBonus(this, bga);

        this.bga.states.register('PlaceTile', this.placeTile);
        this.bga.states.register('PlaceBonus', this.placeBonus);
    }

    private renderCoveredCells(playerId: number, coveredCells: GreetingsFromEarthGamedatas['coveredCells']) {
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (!grid) return;
    
        const cells: { x: number; y: number }[] = Array.isArray(coveredCells)
            ? coveredCells
            : Object.values(coveredCells);

        for (const { x, y } of cells) {
            grid.querySelector(`.gfe-cell[data-x="${x}"][data-y="${y}"]`)
                ?.classList.add('gfe-cell-placed');
        }
    }

    private renderCollectionTrack(playerId: number, count: number): void {
        const track = document.getElementById(`gfe-collection-track-${playerId}`);
        if (!track) return;

        track.innerHTML = '';

        for (let i = 0; i < count; i++) {
            track.innerHTML += `<div class="gfe-collection-track-circle" data-index="${i}" style="top: ${55 + i * 0.3}%; left: ${11.2 + i * 7.8}%"></div>`;
        }
    }
    
    setup(gamedatas: GreetingsFromEarthGamedatas) {
        console.log('Starting game setup', gamedatas);
        this.gamedatas = gamedatas;

        // Set up the game area
        this.bga.gameArea.getElement().insertAdjacentHTML('beforeend', `
            <div id="gfe-game-area">
                <div id="gfe-round-info">
                    Round: <span id="gfe-round">${gamedatas.currentRound}</span> / 14
                </div>
                <div id="gfe-player-boards"></div>
            </div>
        `);

        // Set up player boards
        Object.entries(gamedatas.players).forEach(([pId, player]) => {
            const playerId = Number(pId);
            document.getElementById('gfe-player-boards').insertAdjacentHTML('beforeend', `
                <div id="gfe-board-${playerId}" class="gfe-player-board">
                    <strong>${player.name}</strong>
                    <div id="gfe-sheet-${playerId}" class="gfe-sheet">
                        <div id="gfe-play-grid-${playerId}" class="gfe-play-grid"></div>
                        <div id="gfe-dice-roll-${playerId}" class="gfe-dice-indicator gfe-dice-${gamedatas.diceRoll}"></div>
                        <div id="gfe-collection-track-${playerId}" class="gfe-collection-track"></div>
                    </div>
                </div>
            `);

            // Set up player's play grid
            const playGridEl = document.getElementById(`gfe-play-grid-${playerId}`);
            if (playGridEl) {
                let cellsHTML = '';
                for (let y = 0; y < 13; y++) {
                    for (let x = 0; x < 18; x++) {
                        cellsHTML += `<div class="gfe-cell" data-x="${x}" data-y="${y}"></div>`;
                    }
                }
                playGridEl.innerHTML = cellsHTML;
            }
        });

        // Set up collection track

        const myId = this.bga.players.getCurrentPlayerId();
        this.renderCoveredCells(myId, gamedatas.coveredCells);

        this.renderCollectionTrack(myId, Number(gamedatas.playerState.collection_count));

        this.setupNotifications();
        console.log('Ending game setup');
    }

    setupNotifications() {
        console.log('notifications subscriptions setup');
        this.bga.notifications.setupPromiseNotifications({});
    }

    async notif_newRound(args: NotifNewRoundArgs) {
        console.log('New round:', args.round, 'Dice roll:', args.dice_roll);
        const roundEl = document.getElementById('gfe-round');
        if (roundEl) roundEl.textContent = String(args.round);
    }

    async notif_tilePlaced(args: NotifTilePlacedArgs) {
        const cells = getShapeCells(args.tile_type, args.x, args.y, args.rotation, args.mirror);

        this.renderCoveredCells(args.player_id, cells.map(([x, y]) => ({ x, y, tile_type: args.tile_type })));

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

    async notif_bonusTilePlaced(args: NotifTilePlacedArgs) {
        console.log('Bonus tile placed:', args);
        // TODO: render the bonus tile on the correct player's grid
    }

    async notif_turnFinalized(args: NotifTurnFinalizedArgs) {
        this.renderCollectionTrack(args.player_id, args.collection_count);
    }
}