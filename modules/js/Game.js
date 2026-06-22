class PlaceTile {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
        this.tileSelected = null;
        this.anchorX = null;
        this.anchorY = null;
        this.onGridClick = (event) => {
            const cell = event.target;
            if (!(cell instanceof HTMLElement) || !cell.classList.contains('gfe-cell'))
                return;
            this.anchorX = Number(cell.dataset.x);
            this.anchorY = Number(cell.dataset.y);
            if (isNaN(this.anchorX) || isNaN(this.anchorY))
                return;
            console.log('Tile clicked:', this.anchorX, this.anchorY);
        };
    }
    onEnteringState(args, isCurrentPlayerActive) {
        //loop over player ids
        document.querySelectorAll('.gfe-dice-indicator').forEach(el => {
            el.className = 'gfe-dice-indicator';
            el.classList.add(`gfe-dice-${args.diceRoll}`);
        });
        this.bga.statusBar.setTitle(isCurrentPlayerActive ?
            _('${you} must place your tile on the map') :
            _('Other players are placing their tile...'));
        if (isCurrentPlayerActive) {
            // TODO: show tile options and enable grid interaction
            const playerId = this.bga.players.getCurrentPlayerId();
            const grid = document.getElementById(`gfe-play-grid-${playerId}`);
            this.bga.statusBar.removeActionButtons();
            args.tileOptions.forEach(tile => {
                this.bga.statusBar.addActionButton(tile, () => {
                    this.tileSelected = tile;
                });
            });
            if (!grid)
                return;
            grid.removeEventListener('click', this.onGridClick);
            grid.addEventListener('click', this.onGridClick);
        }
    }
    onLeavingState(args, isCurrentPlayerActive) {
        // TODO: clean up tile preview
    }
    onPlayerActivationChange(args, isCurrentPlayerActive) {
        this.bga.statusBar.removeActionButtons;
        this.onEnteringState(args, isCurrentPlayerActive);
    }
}

class PlaceBonus {
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
    }
    onEnteringState(args, isCurrentPlayerActive) {
        this.bga.statusBar.setTitle(isCurrentPlayerActive ?
            _('${you} must place your bonus tile on the map') :
            _('Other players are placing their bonus tile...'));
        if (isCurrentPlayerActive) {
            // TODO: show bonus tile options and enable grid interaction
            console.log('Pending bonus tiles:', args.pendingTiles);
        }
    }
    onLeavingState(args, isCurrentPlayerActive) {
        // TODO: clean up tile preview
    }
    onPlayerActivationChange(args, isCurrentPlayerActive) {
        this.onEnteringState(args, isCurrentPlayerActive);
    }
}

class Game {
    constructor(bga) {
        console.log('greetingsfromearth constructor');
        this.bga = bga;
        // Register state classes — names must match PHP state class names
        this.placeTile = new PlaceTile(this, bga);
        this.placeBonus = new PlaceBonus(this, bga);
        this.bga.states.register('PlaceTile', this.placeTile);
        this.bga.states.register('PlaceBonus', this.placeBonus);
    }
    setup(gamedatas) {
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
        this.setupNotifications();
        console.log('Ending game setup');
    }
    setupNotifications() {
        console.log('notifications subscriptions setup');
        this.bga.notifications.setupPromiseNotifications({});
    }
    async notif_newRound(args) {
        console.log('New round:', args.round, 'Dice roll:', args.dice_roll);
        const roundEl = document.getElementById('gfe-round');
        if (roundEl)
            roundEl.textContent = String(args.round);
    }
    async notif_tilePlaced(args) {
        console.log('Tile placed:', args);
        // TODO: render the placed tile on the correct player's grid
    }
    async notif_bonusTilePlaced(args) {
        console.log('Bonus tile placed:', args);
        // TODO: render the bonus tile on the correct player's grid
    }
}

export { Game };
