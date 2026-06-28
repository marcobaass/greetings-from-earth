import { Game } from "../Game";
import { computeTileShift, getShapeCells, isInsideGrid } from "../tiles";

export class PlaceTile {
    private tileSelected: string | null = null;
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
        // this.bga.actions.performAction('actPlaceTile', {
        //     activePlayerId: this.bga.players.getCurrentPlayerId(),
        //     tileType: this.tileSelected,
        //     x: this.anchorX,
        //     y: this.anchorY,
        //     rotation: 0,
        //     mirror: false,
        // }) 
    }
    
    private cleanUpPreview(grid: HTMLElement) {
        grid.querySelectorAll('.gfe-cell-preview').forEach(el => {
            el.classList.remove('gfe-cell-preview');
        });
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
    
        cells.forEach(([x, y]) => {
            const cellElement = grid.querySelector(
                `.gfe-cell[data-x="${x}"][data-y="${y}"]`
            );
            if (cellElement) {
                cellElement.classList.add('gfe-cell-preview');
            }
        });
    }


    constructor(
        private game: Game,
        private bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>
    ) {}
    
    onEnteringState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        
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
            // TODO: show tile options and enable grid interaction
            const playerId = this.bga.players.getCurrentPlayerId();
            const grid = document.getElementById(`gfe-play-grid-${playerId}`);        
            
            this.bga.statusBar.removeActionButtons();

            if (!grid) return;

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

            this.bga.statusBar.addActionButton('✔', () => {
                if(!this.tileSelected || this.anchorX == null || this.anchorY == null) return;
                this.bga.actions.performAction('actPlaceTile', {
                    activePlayerId: this.bga.players.getCurrentPlayerId(),
                    tileType: this.tileSelected,
                    x: this.anchorX,
                    y: this.anchorY,
                    rotation: this.rotation,
                    mirror: this.mirror,
                });
            });

            grid.removeEventListener('click', this.onGridClick);
            grid.addEventListener('click', this.onGridClick);
        }
    }

    onLeavingState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if(!grid) return;
        this.cleanUpPreview(grid);
        grid.removeEventListener('click', this.onGridClick);

        this.tileSelected = null;
        this.anchorX = null;
        this.anchorY = null;
        this.rotation = 0;
        this.mirror = false;
    }
    
    onPlayerActivationChange(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        this.bga.statusBar.removeActionButtons();
        this.onEnteringState(args, isCurrentPlayerActive);
    }
}