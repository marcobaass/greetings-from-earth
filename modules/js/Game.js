// Tile shapes — array of [dx, dy] offsets from anchor cell
// All tiles can be rotated and mirrored by the player
const TILE_SHAPES = {
    I4: [[0, 0], [1, 0], [2, 0], [3, 0]],
    U5: [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1]],
    L4: [[0, 0], [0, 1], [0, 2], [1, 2]],
    T4: [[0, 0], [1, 0], [2, 0], [1, 1]],
    SZ4: [[0, 0], [1, 0], [1, 1], [2, 1]],
    L5: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],
};
// Order: rotate, then mirror — must match PHP
function getShapeCells(tileType, anchorX, anchorY, rotation = 0, mirror = false) {
    if (!tileType || !TILE_SHAPES[tileType])
        return [];
    const shape = TILE_SHAPES[tileType];
    const effectiveRotation = mirror ? (360 - rotation) % 360 : rotation;
    const rotated = applyRotation(shape, effectiveRotation);
    const mirrored = mirror ? applyMirror(rotated) : rotated;
    return mirrored.map(([dx, dy]) => [anchorX + dx, anchorY + dy]);
}
function applyRotation(offsets, rotation = 0) {
    return offsets.map(([dx, dy]) => {
        let newX = dx;
        let newY = dy;
        switch (rotation) {
            case 0:
                break;
            case 90:
                newX = -dy;
                newY = dx;
                break;
            case 180:
                newX = -dx;
                newY = -dy;
                break;
            case 270:
                newX = dy;
                newY = -dx;
                break;
            default:
                break;
        }
        return [newX, newY];
    });
}
function applyMirror(offsets) {
    return offsets.map(([dx, dy]) => [-dx, dy]);
}
function isInsideGrid(cells) {
    return cells.every(([x, y]) => x >= 0 && x <= 17 && y >= 0 && y <= 12);
}
function computeTileShift(cells) {
    const xs = cells.map(([x]) => x);
    const ys = cells.map(([, y]) => y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    let shiftX = 0;
    let shiftY = 0;
    if (minX < 0)
        shiftX = -minX;
    else if (maxX > 17)
        shiftX = 17 - maxX;
    if (minY < 0)
        shiftY = -minY;
    else if (maxY > 12)
        shiftY = 12 - maxY;
    return [shiftX, shiftY];
}

class PlaceTile {
    cleanUpPreview(grid) {
        grid.querySelectorAll('.gfe-cell-preview').forEach(el => {
            el.classList.remove('gfe-cell-preview');
        });
    }
    /**
     * Shows a preview of the tile on the grid
     * @param grid The grid element to show the preview on
     * @param tileType The type of tile to show the preview for
     * @param anchorX The x coordinate of the anchor point
     * @param anchorY The y coordinate of the anchor point
    */
    showPreview(grid, tileType, anchorX, anchorY) {
        let cells = getShapeCells(tileType, anchorX, anchorY, this.rotation, this.mirror);
        if (!isInsideGrid(cells)) {
            const [shiftX, shiftY] = computeTileShift(cells);
            anchorX += shiftX;
            anchorY += shiftY;
            cells = getShapeCells(tileType, anchorX, anchorY, this.rotation, this.mirror);
        }
        ;
        this.anchorX = anchorX;
        this.anchorY = anchorY;
        this.cleanUpPreview(grid);
        cells.forEach(([x, y]) => {
            const cellElement = grid.querySelector(`.gfe-cell[data-x="${x}"][data-y="${y}"]`);
            if (cellElement) {
                cellElement.classList.add('gfe-cell-preview');
            }
        });
    }
    constructor(game, bga) {
        this.game = game;
        this.bga = bga;
        this.tileSelected = null;
        this.anchorX = null;
        this.anchorY = null;
        this.onGridClick = (event) => {
            const cell = event.target;
            if (!this.tileSelected)
                return;
            if (!(cell instanceof HTMLElement) || !cell.classList.contains('gfe-cell'))
                return;
            const playerId = this.bga.players.getCurrentPlayerId();
            const grid = document.getElementById(`gfe-play-grid-${playerId}`);
            if (!grid)
                return;
            this.anchorX = Number(cell.dataset.x);
            this.anchorY = Number(cell.dataset.y);
            if (isNaN(this.anchorX) || isNaN(this.anchorY))
                return;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
            // this.bga.actions.performAction('actPlaceTile', {
            //     activePlayerId: this.bga.players.getCurrentPlayerId(),
            //     tileType: this.tileSelected,
            //     x: this.anchorX,
            //     y: this.anchorY,
            //     rotation: 0,
            //     mirror: false,
            // }) 
        };
        this.rotation = 0;
        this.mirror = false;
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
            if (!grid)
                return;
            args.tileOptions.forEach(tile => {
                this.bga.statusBar.addActionButton(tile, () => {
                    this.tileSelected = tile;
                    this.anchorX = 0;
                    this.anchorY = 0;
                    this.rotation = 0;
                    this.mirror = false;
                    this.showPreview(grid, tile, 0, 0);
                });
            });
            this.bga.statusBar.addActionButton('↻', () => {
                if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                    return;
                this.rotation = (this.rotation + 90) % 360;
                this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
            });
            this.bga.statusBar.addActionButton('↺', () => {
                if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                    return;
                this.rotation = (this.rotation + 270) % 360;
                this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
            });
            this.bga.statusBar.addActionButton('↔', () => {
                if (!this.tileSelected || this.anchorX == null || this.anchorY == null)
                    return;
                this.mirror = !this.mirror;
                this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
            });
            grid.removeEventListener('click', this.onGridClick);
            grid.addEventListener('click', this.onGridClick);
        }
    }
    onLeavingState(args, isCurrentPlayerActive) {
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (!grid)
            return;
        this.cleanUpPreview(grid);
        grid.removeEventListener('click', this.onGridClick);
        this.tileSelected = null;
        this.anchorX = null;
        this.anchorY = null;
        this.rotation = 0;
        this.mirror = false;
    }
    onPlayerActivationChange(args, isCurrentPlayerActive) {
        this.bga.statusBar.removeActionButtons();
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
