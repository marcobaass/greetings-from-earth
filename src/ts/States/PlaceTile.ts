import { Game } from "../Game";
import { isPlacementLegal } from "../placement";
import { computeTileShift, getShapeCells, isInsideGrid } from "../tiles";

export class PlaceTile {
    private tileSelected: string | null = null;
    private placeTileArgs: PlaceTileArgs | null = null;
    private anchorX: number | null = null;
    private anchorY: number | null = null;

    private onGridClick = (event: MouseEvent) => { const cell = event.target as HTMLElement;
        if(!this.tileSelected) return;
        if(!(cell instanceof HTMLElement) || !cell.classList.contains('gfe-cell')) return;
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if(!grid) return;
        this.anchorX = Number(cell.dataset.x);
        this.anchorY = Number(cell.dataset.y);

        if (isNaN(this.anchorX) || isNaN(this.anchorY)) return;

        this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);       

    }
    
    private cleanUpPreview(grid: HTMLElement) {
        grid.querySelectorAll('.gfe-cell-preview').forEach(el => {
            el.classList.remove('gfe-cell-preview');
            el.classList.remove('gfe-cell-preview-valid');
            el.classList.remove('gfe-cell-preview-illegal');
        });
    }

    private resetPlacementState() {
        this.tileSelected = null;
        this.anchorX = null;
        this.anchorY = null;
        this.rotation = 0;
        this.mirror = false;
    }

    private cleanupActivePlayer() {
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if (!grid) return;

        // remove valid/invalid indicators
        this.cleanUpPreview(grid);

        grid.classList.remove('gfe-play-grid-interactive')
        grid.removeEventListener('click', this.onGridClick);

        // forgets which tile player picked up and where
        this.resetPlacementState();
    }
    
    private rotation = 0;
    private mirror = false;
    
    /**
     * Shows a preview of the tile on the grid
     * @param grid The grid element to show the preview on
     * @param tileType The type of tile to show the preview for
     * @param anchorX The x coordinate of the anchor point
     * @param anchorY The y coordinate of the anchor point
    */
   private showPreview(grid: HTMLElement, tileType: string, anchorX: number, anchorY: number) {
        let cells = getShapeCells(tileType, anchorX, anchorY, this.rotation, this.mirror);

        if(!isInsideGrid(cells)) {
            const [shiftX, shiftY] = computeTileShift(cells);
            anchorX += shiftX;
            anchorY += shiftY;
            cells = getShapeCells(tileType, anchorX, anchorY, this.rotation, this.mirror);
        };
        
        this.anchorX = anchorX;
        this.anchorY = anchorY;
        
        this.cleanUpPreview(grid);
        
        const legal = isPlacementLegal(cells, this.bga.gameui.gamedatas);
        
        cells.forEach(([x, y]) => {
            const cellElement = grid.querySelector(
                `.gfe-cell[data-x="${x}"][data-y="${y}"]`
            );
            if (cellElement) {
                cellElement.classList.add('gfe-cell-preview');
                cellElement.classList.add(legal ? 'gfe-cell-preview-valid' : 'gfe-cell-preview-illegal');
            }
        });

        if (!this.placeTileArgs) return;

        this.updateActionButtons(legal, grid)
    }

    private updateActionButtons(legal: boolean, grid: HTMLElement) {
        this.bga.statusBar.removeActionButtons();

        if (!this.placeTileArgs) return;

        const allTiles = [
            ...this.placeTileArgs.tileOptions,
            ...this.placeTileArgs.alwaysAvailableTiles,
        ];

        allTiles.forEach(tile => {
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
            if(!this.tileSelected || this.anchorX == null || this.anchorY == null) return;

            this.rotation = (this.rotation + 90) % 360;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        });

        this.bga.statusBar.addActionButton('↺', () => {
            if(!this.tileSelected || this.anchorX == null || this.anchorY == null) return;

            this.rotation = (this.rotation + 270) % 360;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        });

        this.bga.statusBar.addActionButton('↔', () => {
            if(!this.tileSelected || this.anchorX == null || this.anchorY == null) return;
            this.mirror = !this.mirror;
            this.showPreview(grid, this.tileSelected, this.anchorX, this.anchorY);
        });

        if (legal && this.tileSelected) {
            this.bga.statusBar.addActionButton('✔', () => {
                if(!this.tileSelected || this.anchorX == null || this.anchorY == null) return;
                const cells = getShapeCells(this.tileSelected, this.anchorX, this.anchorY, this.rotation, this.mirror);
                if(!isPlacementLegal(cells, this.bga.gameui.gamedatas)) return;

                this.bga.actions.performAction('actPlaceTile', {
                    tileType: this.tileSelected,
                    x: this.anchorX,
                    y: this.anchorY,
                    rotation: this.rotation,
                    mirror: this.mirror,
                });
            });
        }
    }


    constructor(
        private game: Game,
        private bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>
    ) {}
    
    onEnteringState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        this.placeTileArgs = args;
        
        //loop over player ids
        document.querySelectorAll('.gfe-dice-indicator').forEach(el => {
            el.className = 'gfe-dice-indicator';
            el.classList.add(`gfe-dice-${args.diceRoll}`);
        });

        this.bga.statusBar.setTitle(isCurrentPlayerActive ?
            _('${you} must place your tile on the map') :
            _('Other players are placing their tile...')
        );
        

        if (isCurrentPlayerActive) {
            const playerId = this.bga.players.getCurrentPlayerId();
            const grid = document.getElementById(`gfe-play-grid-${playerId}`);  

            if (!grid) return;

            grid.removeEventListener('click', this.onGridClick);
            grid.classList.add('gfe-play-grid-interactive')
            grid.addEventListener('click', this.onGridClick);
            this.updateActionButtons(false, grid);
        }

    }

    onLeavingState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        this.cleanupActivePlayer();
        this.placeTileArgs = null;
    }
    
    onPlayerActivationChange(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        this.placeTileArgs = args;

        if (!isCurrentPlayerActive) {
            this.bga.statusBar.removeActionButtons();
            this.cleanupActivePlayer();
            this.bga.statusBar.setTitle(_('Other players are placing their tile...'));
            return;
        }

        this.onEnteringState(args, true);
    }
}