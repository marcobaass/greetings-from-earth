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
            WHERE `player_id` = '$currentPlayerId'
            ORDER BY `x`, `y`"
        );

        $result["placements"] = $this->getObjectListFromDB(
            "SELECT `tile_type`, `x`, `y`, `rotation`, `mirror`
            FROM `player_placements`
            WHERE `player_id` = '$currentPlayerId'
            ORDER BY `x`, `y`"
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
        $mirrorInt = $mirror ? 1 : 0;
        static::DbQuery("
            INSERT INTO `player_placements` (`player_id`, `x`, `y`, `tile_type`, `rotation`, `mirror`)
            VALUES ($playerId, $x, $y, '$tileType', $rotation, $mirrorInt)
        ");
        foreach ($cells as $cell) {
            $cx = (int) $cell[0];
            $cy = (int) $cell[1];
            static::DbQuery("
                INSERT INTO `player_cells` (`player_id`, `x`, `y`, `tile_type`)
                VALUES ($playerId, $cx, $cy, '$tileType')
            ");
        }

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
        $this->checkStreetArt($playerId, $cellKeys);
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
        $mirrorInt = $mirror ? 1 : 0;
        static::DbQuery("
            INSERT INTO `player_placements` (`player_id`, `x`, `y`, `tile_type`, `rotation`, `mirror`)
            VALUES ($playerId, $x, $y, '$tileType', $rotation, $mirrorInt)
        ");
        foreach ($cells as $cell) {
            $cx = (int) $cell[0];
            $cy = (int) $cell[1];
            static::DbQuery("
                INSERT INTO `player_cells` (`player_id`, `x`, `y`, `tile_type`)
                VALUES ($playerId, $cx, $cy, '$tileType')
            ");
        }

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
        $this->checkStreetArt($playerId, $cellKeys);
    }

    // ===== STREETART =====

    public function isLegalStreetArtCell(int $playerId, int $x, int $y): bool {
        if ($x < 0 || $x > 3 || $y < 0 || $y > 4) {
            return false;
        }

        if (BERLIN_STREET_ART_MAP[$y][$x] === STREET_ART_START) {
            return false;
        }

        $state = $this->getObjectFromDb("SELECT `street_art_completed` FROM `player_state` WHERE `player_id` = '$playerId'");
        $completed = json_decode($state["street_art_completed"] ?? "[]", true) ?? [];

        $completedKeys = [];
        foreach ($completed as $key) {
            $completedKeys[$key] = true;
        }

        if (isset($completedKeys[cellKey($x, $y)])) {
            return false;
        }

        $references = $completedKeys;

        foreach (BERLIN_STREET_ART_MAP as $sy => $row) {
            foreach ($row as $sx => $type) {
                if ($type === STREET_ART_START) {
                    $references[cellKey((int) $sx, (int) $sy)] = true;
                }
            }
        }

        $neighbours = [[$x + 1, $y], [$x - 1, $y], [$x, $y + 1], [$x, $y - 1]];

        foreach ($neighbours as [$nx, $ny]) {
            if (isset($references[cellKey($nx, $ny)])) {
                return true;
            }
        }

        return false;
    }

    public function chooseStreetArtCell(int $playerId, int $x, int $y) {
        if (!$this->hasPendingStreetArt($playerId)) {
            throw new UserException(clienttranslate("No street art mark available"));
        }

        if (!$this->isLegalStreetArtCell($playerId, $x, $y)) {
            throw new UserException(clienttranslate("Illegal street art cell"));
        }

        $state = $this->getObjectFromDb(
            "SELECT `street_art_completed`, `street_art_pending` FROM `player_state` WHERE `player_id` = '$playerId'"
        );

        $completed = json_decode($state["street_art_completed"] ?? "[]", true) ?? [];

        $completed[] = cellKey($x, $y);

        $newPending = (int) $state["street_art_pending"] - 1;

        static::DBQuery(
            "UPDATE            `player_state`
            SET `street_art_completed` = '" .
                json_encode($completed) .
                "',
            `street_art_pending` = $newPending
             WHERE `player_id` = '$playerId' "
        );

        $type = BERLIN_STREET_ART_MAP[$y][$x];
        $reward = STREET_ART_REWARDS[$type] ?? null;

        if ($reward === null) {
            return;
        }

        if (isset($reward["points"])) {
            $points = (int) $reward["points"];

            $scoreState = $this->getObjectFromDb("SELECT `street_art_score` FROM `player_state` WHERE `player_id` = '$playerId'");
            $oldScore = (int) $scoreState["street_art_score"];
            $newScore = $oldScore + $points;

            static::DbQuery("UPDATE `player_state` SET `street_art_score` = $newScore WHERE `player_id` = '$playerId'");

            $this->playerScore->inc($playerId, $points);
        }

        if (isset($reward["tile"])) {
            $tiles = $this->getPendingBonusTiles($playerId);
            $tiles[] = $reward["tile"];

            static::DbQuery(
                "UPDATE `player_state` SET `pending_bonus_tiles` = '" . json_encode($tiles) . "' WHERE `player_id` = '$playerId'"
            );
        }
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

    public function hasPendingStreetArt(int $playerId): bool {
        $state = $this->getObjectFromDb(
            "SELECT `street_art_pending` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        return (int) $state["street_art_pending"] > 0;
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

    public function finishPlacementOrWait(int $playerId): bool {
        // returns true if turn is fully done (caller should finalize + deactivate)
        if ($this->hasPendingStreetArt($playerId)) {
            return false;
        }
        if ($this->hasPendingBonusTiles($playerId)) {
            return false;
        }
        return true;
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
        $this->checkMonumentSurround($playerId);
        $this->checkCollectibles($playerId, $cellKeys);
        $this->checkUFOs($playerId, $cellKeys);
        $this->checkMustSeeClusters($playerId);
        $this->clearCellsThisTurn($playerId);

        // get collection and UFO counts
        $state = $this->getObjectFromDb(
            "SELECT collection_count, collection_score, ufo_count, ufo_score, mustsee_completed, mustsee_score, monument_completed, monument_score, monument_collection_score, street_art_score FROM player_state WHERE player_id = '$playerId'"
        );
        $collectionCount = (int) $state["collection_count"];
        $ufoCount = (int) $state["ufo_count"];
        $mustseeCompleted = json_decode($state["mustsee_completed"] ?? "[]", true);
        $monumentCompleted = json_decode($state["monument_completed"] ?? "[]", true);

        // notify all players
        $this->notify->all("turnFinalized", clienttranslate('${player_name} ends their turn'), [
            "player_id" => $playerId,
            "player_name" => $this->getPlayerNameById($playerId),
            "collection_count" => (int) $state["collection_count"],
            "collection_score" => (int) $state["collection_score"],
            "ufo_count" => (int) $state["ufo_count"],
            "ufo_score" => (int) $state["ufo_score"],
            "mustsee_completed" => json_decode($state["mustsee_completed"] ?? "[]", true),
            "mustsee_score" => (int) $state["mustsee_score"],
            "monument_completed" => json_decode($state["monument_completed"] ?? "[]", true),
            "monument_score" => (int) $state["monument_score"],
            "monument_collection_score" => (int) $state["monument_collection_score"],
            "street_art_score" => (int) $state["street_art_score"],
        ]);
    }

    // ===== CHECK MONUMENT SURROUND =====

    public function checkMonumentSurround(int $playerId): void {
        //load all covered cells for the player
        $rows = $this->getObjectListFromDB("SELECT `x`, `y`, `tile_type` FROM `player_cells` WHERE `player_id` = '$playerId'");

        $coveredKeys = [];
        foreach ($rows as $cell) {
            $coveredKeys[cellKey((int) $cell["x"], (int) $cell["y"])] = true;
        }

        //load already completed clusters
        $state = $this->getObjectFromDB("SELECT `monument_completed` FROM `player_state` WHERE `player_id` = '$playerId'");
        $completedClusters = json_decode($state["monument_completed"] ?? "[]", true) ?? [];
        $previousCount = count($completedClusters);

        //looping clusters and checking if they are completed
        foreach (BERLIN_MONUMENT_CLUSTERS as $clusterId => $clusterCells) {
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
        }

        if ($previousCount === count($completedClusters)) {
            return;
        }

        $monumentScore = 0;
        for ($i = 0; $i < count($completedClusters); $i++) {
            $monumentScore += BERLIN_MONUMENT_SCORES[$i] ?? 0;
        }

        //update the player state with the completed clusters
        static::DbQuery(
            "UPDATE `player_state`
            SET `monument_completed` = '" .
                json_encode($completedClusters) .
                "',
                `monument_score` = $monumentScore
            WHERE `player_id` = '$playerId'"
        );
        $this->calculateMonumentCollectionScore($playerId);
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
                $newCollectionScore = $newCount * 2;

                static::DbQuery(
                    "UPDATE `player_state`
                     SET `collection_count` = $newCount,
                         `collection_score` = $newCollectionScore
                     WHERE `player_id` = '$playerId'"
                );
                $this->calculateMonumentCollectionScore($playerId);
            }
        }
    }

    // ===== Calculate Monument Collection Score =====

    public function calculateMonumentCollectionScore(int $playerId): void {
        $state = $this->getObjectFromDb(
            "SELECT `collection_score`, `monument_score`, `monument_collection_score` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        $monumentCollectionScore = (int) $state["monument_collection_score"];
        $collectionScore = (int) $state["collection_score"];
        $monumentScore = (int) $state["monument_score"];

        $newMonumentCollectionScore = $collectionScore * $monumentScore;

        if ($monumentCollectionScore !== $newMonumentCollectionScore) {
            static::DbQuery(
                "UPDATE `player_state`
                     SET `monument_collection_score` = $newMonumentCollectionScore
                     WHERE `player_id` = '$playerId'"
            );
            $this->playerScore->inc($playerId, $newMonumentCollectionScore - $monumentCollectionScore);
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

    // ===== CHECK STREET ART =====

    public function checkStreetArt(int $playerId, array $cellKeys): void {
        $graffitiCount = 0;
        foreach ($cellKeys as $cellKey) {
            list($x, $y) = explode(",", $cellKey);
            if (getCellType((int) $x, (int) $y) === CELL_GRAFFITI) {
                $graffitiCount++;
            }
        }

        if ($graffitiCount === 0) {
            return;
        }

        $state = $this->getObjectFromDb(
            "SELECT `street_art_pending` FROM `player_state`
         WHERE `player_id` = '$playerId'"
        );
        $newPending = (int) $state["street_art_pending"] + $graffitiCount;

        static::DbQuery(
            "UPDATE `player_state`
         SET `street_art_pending` = $newPending
         WHERE `player_id` = '$playerId'"
        );
    }

    // ===== CHECK UFOs =====

    public function checkUFOs(int $playerId, array $cellKeys): void {
        $state = $this->getObjectFromDb(
            "SELECT `ufo_score` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        $previousUfoScore = (int) $state["ufo_score"];

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
                $score = BERLIN_UFO_SCORES[$newCount - 1];

                $newUfoScore = $previousUfoScore + $score;

                static::DbQuery(
                    "UPDATE `player_state` 
                    SET `ufo_count` = $newCount,
                        `ufo_score` = $newUfoScore
                    WHERE `player_id` = '$playerId'"
                );

                // increment player score
                $this->playerScore->inc($playerId, $score);

                $previousUfoScore = $newUfoScore;
            }
        }
    }

    // ===== CHECK MUST-SEE CLUSTERS =====

    public function checkMustSeeClusters(int $playerId): void {
        $state = $this->getObjectFromDb(
            "SELECT `mustsee_score` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        $previousMustseeScore = (int) $state["mustsee_score"];

        //load all covered cells for the player
        $rows = $this->getObjectListFromDB("SELECT `x`, `y`, `tile_type` FROM `player_cells` WHERE `player_id` = '$playerId'");

        $coveredKeys = [];
        foreach ($rows as $cell) {
            $coveredKeys[cellKey((int) $cell["x"], (int) $cell["y"])] = true;
        }

        //load already completed clusters
        $state = $this->getObjectFromDB("SELECT `mustsee_completed` FROM `player_state` WHERE `player_id` = '$playerId'");
        $completedClusters = json_decode($state["mustsee_completed"] ?? "[]", true) ?? [];
        $previousCount = count($completedClusters);

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
            $newCount = count($completedClusters);
            $score = BERLIN_MUSTSEE_SCORES[$newCount - 1] ?? 0;
            $newMustseeScore = $previousMustseeScore + $score;
            $this->playerScore->inc($playerId, $score);

            $previousMustseeScore = $newMustseeScore;
        }

        if (count($completedClusters) === $previousCount) {
            return;
        }

        //update the player state with the completed clusters
        static::DbQuery(
            "UPDATE `player_state` SET `mustsee_completed` = '" .
                json_encode($completedClusters) .
                "', 
            `mustsee_score` = $newMustseeScore
            WHERE `player_id` = '$playerId'"
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
