<?php
declare(strict_types=1);

namespace Bga\Games\GreetingsFromEarth;

use Bga\Games\GreetingsFromEarth\States\NewRound;
use Bga\Games\GreetingsFromEarth\States\PlaceTile;
use Bga\Games\GreetingsFromEarth\States\PlaceBonus;
use Bga\Games\GreetingsFromEarth\States\EndScore;
use Bga\GameFramework\UserException;

require_once __DIR__ . "/constants.inc.php";
require_once __DIR__ . "/TileHelper.php";
require_once __DIR__ . "/MapHelper.php";

class Game extends \Bga\GameFramework\Table {
    // Dice wheel — public so state classes can access it
    public const DICE_WHEEL = [
        1 => ["I4", "U5"],
        2 => ["U5", "L4"],
        3 => ["L4", "T4"],
        4 => ["SZ4", "T4"],
        5 => ["T5", "SZ4"],
        6 => ["T5", "I4"],
    ];

    public function __construct() {
        parent::__construct();

        $this->initGameStateLabels([
            "current_round" => 10,
            "dice_roll" => 11,
        ]);
    }

    // ===== GAME SETUP =====

    protected function setupNewGame($players, $options = []) {
        // Set up player colors
        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos["player_colors"];

        foreach ($players as $player_id => $player) {
            $query_values[] = vsprintf("(%s, '%s', '%s')", [$player_id, array_shift($default_colors), addslashes($player["player_name"])]);
        }

        static::DbQuery(
            sprintf("INSERT INTO `player` (`player_id`, `player_color`, `player_name`) VALUES %s", implode(",", $query_values))
        );

        $this->reattributeColorsBasedOnPreferences($players, $gameinfos["player_colors"]);
        $this->reloadPlayersBasicInfos();

        // Init global state values
        $this->setGameStateInitialValue("current_round", 0);
        $this->setGameStateInitialValue("dice_roll", 0);

        // Init player_state rows — one per player
        foreach (array_keys($players) as $player_id) {
            static::DbQuery("INSERT INTO `player_state` (`player_id`) VALUES ('$player_id')");
        }

        // Start the game at NewRound
        return NewRound::class;
    }

    // ===== GAME PROGRESSION =====

    public function getGameProgression(): int {
        $currentRound = (int) $this->getGameStateValue("current_round");
        return (int) (($currentRound / TOTAL_ROUNDS) * 100);
    }

    // ===== GET ALL DATAS =====

    protected function getAllDatas(int $currentPlayerId): array {
        $result = [];

        $result["players"] = $this->getCollectionFromDb("SELECT `player_id` AS `id`, `player_score` AS `score` FROM `player`");

        $result["currentRound"] = (int) $this->getGameStateValue("current_round");
        $result["diceRoll"] = (int) $this->getGameStateValue("dice_roll");

        $result["coveredCells"] = $this->getObjectListFromDB(
            "SELECT `x`, `y`, `tile_type` FROM `player_cells`
             WHERE `player_id` = '$currentPlayerId'"
        );

        $result["playerState"] = $this->getObjectFromDb("SELECT * FROM `player_state` WHERE `player_id` = '$currentPlayerId'");

        return $result;
    }

    // ===== PLACEMENT VALIDATION =====

    public function isValidPlacement(int $playerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): bool {
        $cells = getShapeCells($tileType, $x, $y, $rotation, $mirror);

        if (count($cells) === 0) {
            return false;
        }

        foreach ($cells as $cell) {
            $cx = (int) $cell[0];
            $cy = (int) $cell[1];
            if ($cx < 0 || $cx > 17 || $cy < 0 || $cy > 12) {
                return false;
            }
        }

        foreach ($cells as $cell) {
            $cx = (int) $cell[0];
            $cy = (int) $cell[1];
            $type = getCellType($cx, $cy);
            if (in_array($type, [CELL_RIVER, CELL_SBAHN, CELL_MONUMENT], true)) {
                return false;
            }
        }

        $coveredCells = $this->getObjectListFromDB("SELECT `x`, `y`, `tile_type` FROM `player_cells` WHERE `player_id` = '$playerId'");

        $covered = [];
        foreach ($coveredCells as $coveredCell) {
            $key = cellKey((int) $coveredCell["x"], (int) $coveredCell["y"]);
            $covered[$key] = true;
        }

        foreach ($cells as $cell) {
            $cx = (int) $cell[0];
            $cy = (int) $cell[1];
            if (isset($covered[cellKey($cx, $cy)])) {
                return false;
            }
        }

        $playerState = $this->getObjectFromDB("SELECT * FROM `player_state` WHERE `player_id` = '$playerId'");

        $references = getSbahnCellSet();

        if ((int) $playerState["has_started"] !== 0) {
            if ($playerState["last_tile_type"] !== null) {
                $lastCells = getShapeCells(
                    $playerState["last_tile_type"],
                    (int) $playerState["last_x"],
                    (int) $playerState["last_y"],
                    (int) $playerState["last_rotation"],
                    ((int) $playerState["last_mirror"]) === 1
                );
                foreach ($lastCells as $lastCell) {
                    $references[cellKey((int) $lastCell[0], (int) $lastCell[1])] = true;
                }
            }
        }

        foreach ($cells as $cell) {
            $cx = (int) $cell[0];
            $cy = (int) $cell[1];

            $neighbours = [[$cx + 1, $cy], [$cx - 1, $cy], [$cx, $cy + 1], [$cx, $cy - 1]];

            foreach ($neighbours as $neighbour) {
                $nx = (int) $neighbour[0];
                $ny = (int) $neighbour[1];

                if (isset($references[cellKey($nx, $ny)])) {
                    return true;
                }
            }
        }

        return false;
    }

    // ===== TILE PLACEMENT =====

    public function placeTile(int $playerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): void {
        $cells = getShapeCells($tileType, $x, $y, $rotation, $mirror);

        if (count($cells) === 0) {
            throw new UserException("Invalid tile type");
        }
        // validate placement
        if (!$this->isValidPlacement($playerId, $tileType, $x, $y, $rotation, $mirror)) {
            throw new UserException(clienttranslate("Illegal tile placement"));
        }

        // insert into player_cells
        foreach ($cells as $cell) {
            $cx = (int) $cell[0];
            $cy = (int) $cell[1];
            static::DbQuery("
                INSERT INTO `player_cells` (`player_id`, `x`, `y`, `tile_type`)
                VALUES ($playerId, $cx, $cy, '$tileType')
            ");
        }

        $mirrorInt = $mirror ? 1 : 0;

        static::DbQuery("
            UPDATE `player_state` SET
                `has_started`     = 1,
                `last_x`          = $x,
                `last_y`          = $y,
                `last_tile_type`  = '$tileType',
                `last_rotation`   = $rotation,
                `last_mirror`     = $mirrorInt
            WHERE `player_id` = $playerId
        ");

        $this->addCellsThisTurn($playerId, $cells);

        $cellKeys = array_map(function ($cell) {
            return cellKey((int) $cell[0], (int) $cell[1]);
        }, $cells);

        $this->checkBonusTilesFromCells($playerId, $cellKeys);
    }

    public function placeBonusTile(int $playerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): void {
        $cells = getShapeCells($tileType, $x, $y, $rotation, $mirror);

        if (count($cells) === 0) {
            throw new UserException("Invalid tile type");
        }

        // validate placement
        if (!$this->isValidPlacement($playerId, $tileType, $x, $y, $rotation, $mirror)) {
            throw new UserException(clienttranslate("Illegal tile placement"));
        }

        // insert into player_cells
        foreach ($cells as $cell) {
            $cx = (int) $cell[0];
            $cy = (int) $cell[1];
            static::DbQuery("
                INSERT INTO `player_cells` (`player_id`, `x`, `y`, `tile_type`)
                VALUES ($playerId, $cx, $cy, '$tileType')
            ");
        }

        $mirrorInt = $mirror ? 1 : 0;

        static::DbQuery("
            UPDATE `player_state` SET
                `has_started`     = 1,
                `last_x`          = $x,
                `last_y`          = $y,
                `last_tile_type`  = '$tileType',
                `last_rotation`   = $rotation,
                `last_mirror`     = $mirrorInt
            WHERE `player_id` = $playerId
        ");

        $this->addCellsThisTurn($playerId, $cells);

        $cellKeys = array_map(function ($cell) {
            return cellKey((int) $cell[0], (int) $cell[1]);
        }, $cells);

        $this->removePendingBonusTile($playerId, $tileType);

        $this->checkBonusTilesFromCells($playerId, $cellKeys);
    }

    // ===== BONUS TILE HELPERS =====

    public function hasPendingBonusTiles(int $playerId): bool {
        $state = $this->getObjectFromDb(
            "SELECT `pending_bonus_tiles` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        $tiles = json_decode($state["pending_bonus_tiles"], true);
        return count($tiles) > 0;
    }

    public function getPendingBonusTiles(int $playerId): array {
        $state = $this->getObjectFromDb(
            "SELECT `pending_bonus_tiles` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        return json_decode($state["pending_bonus_tiles"], true);
    }

    public function clearPendingBonusTiles(int $playerId): void {
        static::DbQuery(
            "UPDATE `player_state` SET `pending_bonus_tiles` = '[]'
             WHERE `player_id` = '$playerId'"
        );
    }

    public function removePendingBonusTile(int $playerId, string $tileType): void {
        $tiles = $this->getPendingBonusTiles($playerId);
        $index = array_search($tileType, $tiles, true);
        if ($index === false) {
            throw new UserException("Tile type not found in pending bonus tiles");
        }
        array_splice($tiles, $index, 1);
        static::DbQuery(
            "UPDATE `player_state` SET `pending_bonus_tiles` = '" .
                json_encode($tiles) .
                "'
            WHERE `player_id` = '$playerId'"
        );
    }

    // ===== CELLS THIS TURN =====

    public function getCellsThisTurn(int $playerId): array {
        $state = $this->getObjectFromDb(
            "SELECT `cells_this_turn` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        return json_decode($state["cells_this_turn"], true);
    }

    public function addCellsThisTurn(int $playerId, array $cells): void {
        $cellKeys = array_map(function ($cell) {
            return cellKey((int) $cell[0], (int) $cell[1]);
        }, $cells);
        $currentCells = $this->getCellsThisTurn($playerId);
        $newCells = array_merge($currentCells, $cellKeys);
        static::DbQuery(
            "UPDATE `player_state` SET `cells_this_turn` = '" .
                json_encode($newCells) .
                "'
             WHERE `player_id` = '$playerId'"
        );
    }

    public function clearCellsThisTurn(int $playerId): void {
        static::DbQuery(
            "UPDATE `player_state` SET `cells_this_turn` = '[]'
             WHERE `player_id` = '$playerId'"
        );
    }

    // ===== FINALIZE TURN =====
    // This is called when a player ends their turn
    public function finalizeTurn(int $playerId): void {
        $cellKeys = $this->getCellsThisTurn($playerId);
        $this->checkCollectibles($playerId, $cellKeys);
        $this->checkUFOs($playerId, $cellKeys);
        $this->checkMustSeeClusters($playerId);
        $this->clearCellsThisTurn($playerId);

        // get collection and UFO counts
        $state = $this->getObjectFromDb(
            "SELECT collection_count, ufo_count, mustsee_completed FROM player_state WHERE player_id = '$playerId'"
        );
        $collectionCount = (int) $state["collection_count"];
        $ufoCount = (int) $state["ufo_count"];
        $mustseeCompleted = json_decode($state["mustsee_completed"] ?? "[]", true);

        // notify all players
        $this->notify->all("turnFinalized", clienttranslate('${player_name} ends their turn'), [
            "player_id" => $playerId,
            "player_name" => $this->getPlayerNameById($playerId),
            "collection_count" => $collectionCount,
            "ufo_count" => $ufoCount,
            "mustsee_completed" => $mustseeCompleted,
        ]);
    }

    // ===== CHECK COLLECTIBLES =====

    public function checkCollectibles(int $playerId, array $cellKeys): void {
        foreach ($cellKeys as $cellKey) {
            list($x, $y) = explode(",", $cellKey);
            $type = getCellType((int) $x, (int) $y);
            if (in_array($type, [CELL_COLLECTION], true)) {
                $state = $this->getObjectFromDb(
                    "SELECT `collection_count` FROM `player_state`
                     WHERE `player_id` = '$playerId'"
                );
                $count = (int) $state["collection_count"];

                $newCount = $count + 1;

                static::DbQuery(
                    "UPDATE `player_state` SET `collection_count` = $newCount
                     WHERE `player_id` = '$playerId'"
                );

                // increment player score
                $this->playerScore->inc($playerId, 2);
            }
        }
    }

    // ===== CHECK Currywurst and E-Scooter =====

    public function checkBonusTilesFromCells(int $playerId, array $cellKeys): void {
        foreach ($cellKeys as $cellKey) {
            list($x, $y) = explode(",", $cellKey);
            $type = getCellType((int) $x, (int) $y);

            // check for currywurst and e-scooter bonus tiles
            if (in_array($type, [CELL_CURRYWURST], true)) {
                $tiles = $this->getPendingBonusTiles($playerId);
                $tiles[] = "I2";

                static::DbQuery(
                    "UPDATE `player_state` SET `pending_bonus_tiles` = '" .
                        json_encode($tiles) .
                        "'
                     WHERE `player_id` = '$playerId'"
                );
            }
            if (in_array($type, [CELL_ESCOOTER], true)) {
                $tiles = $this->getPendingBonusTiles($playerId);
                $tiles[] = "I4";

                static::DbQuery(
                    "UPDATE `player_state` SET `pending_bonus_tiles` = '" .
                        json_encode($tiles) .
                        "'
                     WHERE `player_id` = '$playerId'"
                );
            }
        }
    }

    // ===== CHECK UFOs =====

    public function checkUFOs(int $playerId, array $cellKeys): void {
        foreach ($cellKeys as $cellKey) {
            list($x, $y) = explode(",", $cellKey);
            $type = getCellType((int) $x, (int) $y);
            if (in_array($type, [CELL_UFO], true)) {
                $state = $this->getObjectFromDb(
                    "SELECT `ufo_count` FROM `player_state`
                         WHERE `player_id` = '$playerId'"
                );
                $count = (int) $state["ufo_count"];

                $newCount = $count + 1;

                static::DbQuery(
                    "UPDATE `player_state` SET `ufo_count` = $newCount
                         WHERE `player_id` = '$playerId'"
                );

                $score = BERLIN_UFO_SCORES[$newCount - 1];

                // increment player score
                $this->playerScore->inc($playerId, $score);
            }
        }
    }

    // ===== CHECK MUST-SEE CLUSTERS =====

    public function checkMustSeeClusters(int $playerId): void {
        //load all covered cells for the player
        $rows = $this->getObjectListFromDB("SELECT `x`, `y`, `tile_type` FROM `player_cells` WHERE `player_id` = '$playerId'");

        $coveredKeys = [];
        foreach ($rows as $cell) {
            $coveredKeys[cellKey((int) $cell["x"], (int) $cell["y"])] = true;
        }

        //load already completed clusters
        $state = $this->getObjectFromDB("SELECT `mustsee_completed` FROM `player_state` WHERE `player_id` = '$playerId'");
        $completedClusters = json_decode($state["mustsee_completed"] ?? "[]", true);

        //looping clusters and checking if they are completed
        foreach (BERLIN_MUSTSEE_CLUSTERS as $clusterId => $clusterCells) {
            //check if the cluster is already completed
            if (in_array($clusterId, $completedClusters, true)) {
                continue;
            }

            //Check: every [x,y] in the cluster exists in the covered set
            $allCovered = true;
            foreach ($clusterCells as [$x, $y]) {
                if (!isset($coveredKeys[cellKey((int) $x, (int) $y)])) {
                    $allCovered = false;
                    break;
                }
            }

            if (!$allCovered) {
                continue;
            }

            //If all cells are covered, complete the cluster
            $completedClusters[] = $clusterId;
            $score = BERLIN_MUSTSEE_SCORES[count($completedClusters) - 1] ?? 0;
            $this->playerScore->inc($playerId, $score);
        }

        //update the player state with the completed clusters
        static::DbQuery(
            "UPDATE `player_state` SET `mustsee_completed` = '" . json_encode($completedClusters) . "' WHERE `player_id` = '$playerId'"
        );
    }

    // ===== DEBUG HELPERS =====

    public function debug_goToState(int $state = 20): void {
        $this->gamestate->jumpToState($state);
    }

    // ===== DB UPGRADE =====

    public function upgradeTableDb($from_version): void {
        // Handle DB migrations here when needed
    }
}
