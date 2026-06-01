interface GreetingsFromEarthPlayer extends Player {
}

interface GreetingsFromEarthGamedatas extends Gamedatas<GreetingsFromEarthPlayer> {
    currentRound: number;
    diceRoll: number;
    coveredCells: { x: number; y: number; tile_type: string }[];
    playerState: {
        player_id: number;
        last_x: number | null;
        last_y: number | null;
        has_started: number;
        currywurst_count: number;
        escooter_count: number;
        ufo_count: number;
        collection_count: number;
        monument_count: number;
        street_art_progress: number;
        pending_bonus_tiles: string;
        mustsee_completed: string;
    };
}

// State args
interface PlaceTileArgs {
    diceRoll: number;
    tileOptions: string[];
}

interface PlaceBonusArgs {
    pendingTiles: string[];
}

// Notification args
interface NotifTilePlacedArgs {
    player_id: number;
    player_name: string;
    tile_type: string;
    x: number;
    y: number;
    rotation: number;
    mirror: boolean;
}

interface NotifNewRoundArgs {
    round: number;
    dice_roll: number;
}