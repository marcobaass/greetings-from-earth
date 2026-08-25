interface GreetingsFromEarthPlayer extends Player {}

interface GreetingsFromEarthGamedatas extends Gamedatas<GreetingsFromEarthPlayer> {
  currentRound: number;
  diceRoll: number;
  coveredCells: { x: number; y: number; tile_type: string }[];
  placements: { tile_type: string; x: number; y: number; rotation: number; mirror: number }[];
  playerState: {
    player_id: number;
    last_x: number | null;
    last_y: number | null;
    last_tile_type: string | null;
    last_rotation: number;
    last_mirror: number;
    has_started: number;
    currywurst_count: number;
    escooter_count: number;
    ufo_count: number;
    ufo_score: number;
    collection_count: number;
    collection_score: number;
    monument_count: number;
    monument_score: number;
    monument_collection_score: number;
    pending_bonus_tiles: string;
    pending_bonus_slots: number;
    mustsee_completed: string;
    mustsee_score: number;
    monument_completed: string;
    cells_this_turn: string;
    street_art_completed: string;
    street_art_score: number;
    street_art_pending: number;
  };
}

// State args
interface PlaceTileArgs {
  diceRoll: number;
  tileOptions: string[];
  alwaysAvailableTiles: string[];
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
  pending_tiles?: string[];
  street_art_pending?: number;
  awaiting_turn_confirm?: boolean;
  collection_count: number;
  collection_score: number;
  ufo_count: number;
  ufo_score: number;
  mustsee_completed: string[];
  mustsee_score: number;
  monument_completed: string[];
  monument_score: number;
  monument_collection_score: number;
  street_art_score: number;
}

interface NotifNewRoundArgs {
  round: number;
  dice_roll: number;
}

interface NotifTurnFinalizedArgs {
  player_id: number;
  collection_count: number;
  collection_score: number;
  ufo_count: number;
  ufo_score: number;
  mustsee_completed: string[];
  mustsee_score: number;
  monument_completed: string[];
  monument_score: number;
  monument_collection_score: number;
  pending_tiles?: string[];
  street_art_completed?: string[];
  street_art_pending?: number;
  street_art_score: number;
}

interface NotifStreetArtChosenArgs {
  player_id: number;
  player_name: string;
  x: number;
  y: number;
  street_art_pending: number;
  street_art_completed: string[];
  street_art_score: number;
  pending_tiles: string[];
  awaiting_turn_confirm?: boolean;
}

interface NotifTurnUndoneArgs {
  player_id: number;
  player_name: string;
  coveredCells: GreetingsFromEarthGamedatas["coveredCells"];
  placements: GreetingsFromEarthGamedatas["placements"];
  playerState: GreetingsFromEarthGamedatas["playerState"];
}
