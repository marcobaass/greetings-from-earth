import { Game } from "../Game";
import { getShapeCells } from "../tiles";

export class PlaceTile {
    private tileSelected: string | null = null;
    private anchorX: number | null = null;
    private anchorY: number | null = null;

    private onGridClick = (event: MouseEvent) => { const cell = event.target as HTMLElement;
        if(!this.tileSelected) return;
        if(!(cell instanceof HTMLElement) || !cell.classList.contains('gfe-cell')) return;
        this.anchorX = Number(cell.dataset.x);
        this.anchorY = Number(cell.dataset.y);

        const playerId = this.bga.players.getCurrentPlayerId();
        const grid = document.getElementById(`gfe-play-grid-${playerId}`);
        if(!grid) return;

        if (isNaN(this.anchorX) || isNaN(this.anchorY)) return;

        const shapeCells = getShapeCells(this.tileSelected, this.anchorX, this.anchorY, 0, false);

        grid.querySelectorAll('.gfe-cell-preview').forEach(el => {
            el.classList.remove('gfe-cell-preview');
        })

        shapeCells.forEach(([x, y]) => {
            const cellElement = grid.querySelector(
                `.gfe-cell[data-x="${x}"][data-y="${y}"]`
            );
            if (cellElement) {
                cellElement.classList.add('gfe-cell-preview');
            }
        });

        // this.bga.actions.performAction('actPlaceTile', {
        //     activePlayerId: this.bga.players.getCurrentPlayerId(),
        //     tileType: this.tileSelected,
        //     x: this.anchorX,
        //     y: this.anchorY,
        //     rotation: 0,
        //     mirror: false,
        // }) 
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
            args.tileOptions.forEach(tile => {
                this.bga.statusBar.addActionButton(tile, () => {
                    this.tileSelected = tile;
                });
            });

            if (!grid) return;

            grid.removeEventListener('click', this.onGridClick);
            grid.addEventListener('click', this.onGridClick);
        }
    }

    onLeavingState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        // TODO: clean up tile preview
    }
    
    onPlayerActivationChange(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        this.bga.statusBar.removeActionButtons();
        this.onEnteringState(args, isCurrentPlayerActive);
    }
}