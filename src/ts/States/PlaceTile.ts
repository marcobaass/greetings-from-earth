import { Game } from "../Game";

export class PlaceTile {
    constructor(private game: Game, private bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>) {}

    onEnteringState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        this.bga.statusBar.setTitle(isCurrentPlayerActive ?
            _('${you} must place your tile on the map') :
            _('Other players are placing their tile...')
        );

        if (isCurrentPlayerActive) {
            // TODO: show tile options and enable grid interaction
            console.log('Tile options:', args.tileOptions, 'Dice roll:', args.diceRoll);
        }
    }

    onLeavingState(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        // TODO: clean up tile preview
    }

    onPlayerActivationChange(args: PlaceTileArgs, isCurrentPlayerActive: boolean) {
        this.onEnteringState(args, isCurrentPlayerActive);
    }
}