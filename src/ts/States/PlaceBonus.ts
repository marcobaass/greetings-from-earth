import { Game } from "../Game";

export class PlaceBonus {
    constructor(private game: Game, private bga: Bga<GreetingsFromEarthPlayer, GreetingsFromEarthGamedatas>) {}

    onEnteringState(args: PlaceBonusArgs, isCurrentPlayerActive: boolean) {
        this.bga.statusBar.setTitle(isCurrentPlayerActive ?
            _('${you} must place your bonus tile on the map') :
            _('Other players are placing their bonus tile...')
        );

        if (isCurrentPlayerActive) {
            // TODO: show bonus tile options and enable grid interaction
            console.log('Pending bonus tiles:', args.pendingTiles);
        }
    }

    onLeavingState(args: PlaceBonusArgs, isCurrentPlayerActive: boolean) {
        // TODO: clean up tile preview
    }

    onPlayerActivationChange(args: PlaceBonusArgs, isCurrentPlayerActive: boolean) {
        this.onEnteringState(args, isCurrentPlayerActive);
    }
}