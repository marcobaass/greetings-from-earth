import { PlaceTile } from "./States/PlaceTile";
import { PlaceBonus } from "./States/PlaceBonus";

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
                    <div id="gfe-grid-${playerId}" class="gfe-grid"></div>
                </div>
            `);
            // TODO: render the Berlin map grid for this player
        });

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
        console.log('Tile placed:', args);
        // TODO: render the placed tile on the correct player's grid
    }

    async notif_bonusTilePlaced(args: NotifTilePlacedArgs) {
        console.log('Bonus tile placed:', args);
        // TODO: render the bonus tile on the correct player's grid
    }
}