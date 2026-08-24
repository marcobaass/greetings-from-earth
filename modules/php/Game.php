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

        $this->playerStats->init(
            ["monument_score", "collection_score", "monument_collection_score", "mustsee_score", "ufo_score", "street_art_score"],
            0
        );

        // Init global state values
        $this->setGameStateInitialValue("current_round", 0);
        $this->setGameStateInitialValue("dice_roll", 0);

        // Init player_state rows — one per player
        foreach (array_keys($players) as $player_id) {
            static::DbQuery("INSERT INTO `player_state` (`player_id`, `turn_snapshot`) VALUES ('$player_id', '{}')");
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

        $this->captureTurnBaselineIfNeeded($playerId);

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

        $this->captureTurnBaselineIfNeeded($playerId);

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

        $this->spendBonusPlacement($playerId, $tileType);

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
            $this->grantBonusTile($playerId, $reward["tile"]);
        }
    }

    // ===== BONUS TILE HELPERS =====
    // Pool = specific bonus shapes still available. Slots = remaining placements
    // (shape or I1/I2). Alternatives spend a slot and leave the pool unchanged.
    // When slots hit 0, leftover pool tiles are discarded.

    private function getPendingBonusState(int $playerId): array {
        $state = $this->getObjectFromDb(
            "SELECT `pending_bonus_tiles`, `pending_bonus_slots` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        $tiles = json_decode($state["pending_bonus_tiles"] ?? "[]", true);
        return [
            "tiles" => is_array($tiles) ? $tiles : [],
            "slots" => (int) ($state["pending_bonus_slots"] ?? 0),
        ];
    }

    private function setPendingBonusState(int $playerId, array $tiles, int $slots): void {
        if ($slots <= 0) {
            $tiles = [];
            $slots = 0;
        }
        $tilesJson = json_encode(array_values($tiles));
        static::DbQuery(
            "UPDATE `player_state` SET `pending_bonus_tiles` = '$tilesJson', `pending_bonus_slots` = $slots
             WHERE `player_id` = '$playerId'"
        );
    }

    public function hasPendingBonusTiles(int $playerId): bool {
        return $this->getPendingBonusSlots($playerId) > 0;
    }

    public function getPendingBonusSlots(int $playerId): int {
        return $this->getPendingBonusState($playerId)["slots"];
    }

    public function isValidBonusTileChoice(int $playerId, string $tileType): bool {
        if ($this->getPendingBonusSlots($playerId) <= 0) {
            return false;
        }
        if (in_array($tileType, ALWAYS_AVAILABLE_TILES, true)) {
            return true;
        }
        return in_array($tileType, $this->getPendingBonusTiles($playerId), true);
    }

    public function grantBonusTile(int $playerId, string $tileType): void {
        $state = $this->getPendingBonusState($playerId);
        $state["tiles"][] = $tileType;
        $this->setPendingBonusState($playerId, $state["tiles"], $state["slots"] + 1);
    }

    /**
     * Spend one bonus placement. I1/I2 never remove a pool tile; a pool shape does.
     * Remaining pool is discarded when no slots are left.
     */
    public function spendBonusPlacement(int $playerId, string $tileType): void {
        $state = $this->getPendingBonusState($playerId);
        if ($state["slots"] <= 0) {
            throw new UserException(clienttranslate("No bonus tile to place"));
        }

        $tiles = $state["tiles"];
        if (!in_array($tileType, ALWAYS_AVAILABLE_TILES, true)) {
            $index = array_search($tileType, $tiles, true);
            if ($index === false) {
                throw new UserException("Tile type not found in pending bonus tiles");
            }
            array_splice($tiles, $index, 1);
        }

        $this->setPendingBonusState($playerId, $tiles, $state["slots"] - 1);
    }

    public function hasPendingStreetArt(int $playerId): bool {
        $state = $this->getObjectFromDb(
            "SELECT `street_art_pending` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        return (int) $state["street_art_pending"] > 0;
    }

    public function getPendingBonusTiles(int $playerId): array {
        return $this->getPendingBonusState($playerId)["tiles"];
    }

    public function clearPendingBonusTiles(int $playerId): void {
        $this->setPendingBonusState($playerId, [], 0);
    }

    public function finishPlacementOrWait(int $playerId): bool {
        // true = nothing left to place (player should End turn or Undo)
        if ($this->hasPendingStreetArt($playerId)) {
            return false;
        }
        if ($this->hasPendingBonusTiles($playerId)) {
            return false;
        }
        return true;
    }

    /**
     * True after placements are done for this turn, until End turn / Undo.
     * Derived from cells_this_turn — no extra DB column.
     */
    public function isAwaitingTurnConfirm(int $playerId): bool {
        if ($this->hasTurnEnded($playerId)) {
            return false;
        }
        if (!$this->finishPlacementOrWait($playerId)) {
            return false;
        }
        $cells = $this->getCellsThisTurn($playerId);
        return is_array($cells) && count($cells) > 0;
    }

    public function hasTurnEnded(int $playerId): bool {
        $state = $this->getObjectFromDb("SELECT `turn_ended` FROM `player_state` WHERE `player_id` = '$playerId'");
        return (int) ($state["turn_ended"] ?? 0) === 1;
    }

    public function setTurnEnded(int $playerId, bool $ended): void {
        $value = $ended ? 1 : 0;
        static::DbQuery("UPDATE `player_state` SET `turn_ended` = $value WHERE `player_id` = '$playerId'");
    }

    /**
     * Players who still must act this round (place and/or press End turn).
     */
    public function getPlayersStillInRound(): array {
        $players = $this->loadPlayersBasicInfos();
        $ids = [];
        foreach (array_keys($players) as $playerId) {
            if (!$this->hasTurnEnded((int) $playerId)) {
                $ids[] = (int) $playerId;
            }
        }
        return $ids;
    }

    /**
     * Keep everyone who has not pressed End turn multiactive.
     * Prevents the framework from treating a placement as “done” and jumping to NewRound.
     */
    public function keepPlayersInRoundActive(string $nextStateIfNone = NewRound::class): void {
        $stillIn = $this->getPlayersStillInRound();
        if (count($stillIn) === 0) {
            $this->gamestate->setAllPlayersNonMultiactive($nextStateIfNone);
            return;
        }
        $this->gamestate->setPlayersMultiactive($stillIn, $nextStateIfNone, true);
    }

    /**
     * Notify fields after a placement (does not end the turn).
     */
    public function afterPlacementStatus(int $playerId): array {
        $state = $this->getObjectFromDb(
            "SELECT `street_art_pending`, `street_art_completed` FROM `player_state` WHERE `player_id` = '$playerId'"
        );
        return [
            "awaiting_turn_confirm" => $this->isAwaitingTurnConfirm($playerId),
            "pending_tiles" => $this->getPendingBonusTiles($playerId),
            "street_art_pending" => (int) $state["street_art_pending"],
            "street_art_completed" => json_decode($state["street_art_completed"] ?? "[]", true) ?? [],
        ];
    }

    /**
     * After End turn: wipe undo photo so a later round can never restore this turn.
     */
    public function invalidateTurnUndo(int $playerId): void {
        static::DbQuery(
            "UPDATE `player_state` SET `turn_snapshot` = '{}'
             WHERE `player_id` = '$playerId'"
        );
    }

    /**
     * True only if there is a valid snapshot AND the player has changed something since it was taken.
     */
    public function canUndoTurn(int $playerId): bool {
        if ($this->hasTurnEnded($playerId)) {
            return false;
        }

        $row = $this->getObjectFromDb("SELECT `turn_snapshot` FROM `player_state` WHERE `player_id` = '$playerId'");
        $snapshot = json_decode($row["turn_snapshot"] ?? "{}", true);
        if (!is_array($snapshot) || !isset($snapshot["max_placement_id"])) {
            return false;
        }

        $maxPlacementId = (int) $snapshot["max_placement_id"];
        $newerCount = (int) $this->getUniqueValueFromDB(
            "SELECT COUNT(*) FROM `player_placements`
             WHERE `player_id` = $playerId AND `placement_id` > $maxPlacementId"
        );
        if ($newerCount > 0) {
            return true;
        }

        $state = $this->getObjectFromDb(
            "SELECT `street_art_pending`, `street_art_completed`, `pending_bonus_tiles`, `pending_bonus_slots`, `cells_this_turn`
             FROM `player_state` WHERE `player_id` = '$playerId'"
        );

        if ((int) $state["street_art_pending"] !== (int) $snapshot["street_art_pending"]) {
            return true;
        }
        if ($state["street_art_completed"] !== $snapshot["street_art_completed"]) {
            return true;
        }
        if ($state["pending_bonus_tiles"] !== $snapshot["pending_bonus_tiles"]) {
            return true;
        }
        if ((int) $state["pending_bonus_slots"] !== (int) ($snapshot["pending_bonus_slots"] ?? 0)) {
            return true;
        }
        if ($state["cells_this_turn"] !== $snapshot["cells_this_turn"]) {
            return true;
        }

        return false;
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

    // ===== UNDO TURN =====

    /**
     * Before the first placement of a turn, refresh the undo baseline.
     * Guarantees max_placement_id includes all previous rounds even if NewRound snapshot was stale.
     */
    public function captureTurnBaselineIfNeeded(int $playerId): void {
        $cells = $this->getCellsThisTurn($playerId);
        if (is_array($cells) && count($cells) > 0) {
            return;
        }
        if ($this->hasPendingStreetArt($playerId) || $this->hasPendingBonusTiles($playerId)) {
            return;
        }
        $this->saveTurnSnapshot($playerId);
    }

    public function saveTurnSnapshot(int $playerId): void {
        $maxPlacementId = (int) $this->getUniqueValueFromDB(
            "SELECT COALESCE(MAX(`placement_id`), 0)
             FROM `player_placements`
             WHERE `player_id` = $playerId"
        );

        $state = $this->getObjectFromDb(
            "SELECT
            `last_x`, `last_y`, `last_tile_type`, `last_rotation`, `last_mirror`,
            `has_started`, `currywurst_count`, `escooter_count`,
            `street_art_completed`, `street_art_score`, `street_art_pending`,
            `pending_bonus_tiles`, `pending_bonus_slots`, `cells_this_turn`
            FROM `player_state`
            WHERE `player_id` = '$playerId'"
        );

        $snapshot = [
            "max_placement_id" => $maxPlacementId,
            "last_x" => $state["last_x"],
            "last_y" => $state["last_y"],
            "last_tile_type" => $state["last_tile_type"],
            "last_rotation" => (int) $state["last_rotation"],
            "last_mirror" => (int) $state["last_mirror"],
            "has_started" => (int) $state["has_started"],
            "currywurst_count" => (int) $state["currywurst_count"],
            "escooter_count" => (int) $state["escooter_count"],
            "street_art_completed" => $state["street_art_completed"],
            "street_art_score" => (int) $state["street_art_score"],
            "street_art_pending" => (int) $state["street_art_pending"],
            "pending_bonus_tiles" => $state["pending_bonus_tiles"],
            "pending_bonus_slots" => (int) $state["pending_bonus_slots"],
            "cells_this_turn" => $state["cells_this_turn"],
        ];

        $json = static::escapeStringForDB(json_encode($snapshot));
        static::DbQuery("UPDATE `player_state` SET `turn_snapshot` = '$json' WHERE `player_id` = '$playerId'");
    }

    public function restoreTurnSnapshot(int $playerId): void {
        $row = $this->getObjectFromDb("SELECT `turn_snapshot` FROM `player_state` WHERE `player_id` = '$playerId'");
        $snapshot = json_decode($row["turn_snapshot"] ?? "{}", true);

        if (!is_array($snapshot) || !isset($snapshot["max_placement_id"])) {
            throw new UserException(clienttranslate("Nothing to undo"));
        }

        $maxPlacementId = (int) $snapshot["max_placement_id"];

        $lastX = $snapshot["last_x"] === null ? "NULL" : "'" . $snapshot["last_x"] . "'";
        $lastY = $snapshot["last_y"] === null ? "NULL" : "'" . $snapshot["last_y"] . "'";
        $lastTileType = $snapshot["last_tile_type"] === null ? "NULL" : "'" . $snapshot["last_tile_type"] . "'";
        $pendingSlots = array_key_exists("pending_bonus_slots", $snapshot)
            ? (int) $snapshot["pending_bonus_slots"]
            : count(json_decode($snapshot["pending_bonus_tiles"] ?? "[]", true) ?: []);

        static::DbQuery(
            "UPDATE `player_state` SET
            `last_x` = $lastX,
            `last_y` = $lastY,
            `last_tile_type` = $lastTileType,
            `last_rotation` = " .
                (int) $snapshot["last_rotation"] .
                ",
            `last_mirror` = " .
                (int) $snapshot["last_mirror"] .
                ",
            `has_started` = " .
                (int) $snapshot["has_started"] .
                ",
            `currywurst_count` = " .
                (int) $snapshot["currywurst_count"] .
                ",
            `escooter_count` = " .
                (int) $snapshot["escooter_count"] .
                ",
            `street_art_completed` = '" .
                $snapshot["street_art_completed"] .
                "',
            `street_art_score` = " .
                (int) $snapshot["street_art_score"] .
                ",
            `street_art_pending` = " .
                (int) $snapshot["street_art_pending"] .
                ",
            `pending_bonus_tiles` = '" .
                $snapshot["pending_bonus_tiles"] .
                "',
            `pending_bonus_slots` = " .
                $pendingSlots .
                ",
            `cells_this_turn` = '" .
                $snapshot["cells_this_turn"] .
                "'
         WHERE `player_id` = '$playerId'"
        );

        $placements = $this->getObjectListFromDB(
            "SELECT `placement_id`, `tile_type`, `x`, `y`, `rotation`, `mirror`
         FROM `player_placements`
         WHERE `player_id` = '$playerId' AND `placement_id` > $maxPlacementId"
        );
        foreach ($placements as $placement) {
            $cells = getShapeCells(
                $placement["tile_type"],
                (int) $placement["x"],
                (int) $placement["y"],
                (int) $placement["rotation"],
                ((int) $placement["mirror"]) === 1
            );
            foreach ($cells as $cell) {
                $cx = (int) $cell[0];
                $cy = (int) $cell[1];
                static::DbQuery(
                    "DELETE FROM `player_cells`
                    WHERE `player_id` = '$playerId' AND `x` = $cx AND `y` = $cy"
                );
            }
            $placementId = (int) $placement["placement_id"];
            static::DbQuery("DELETE FROM `player_placements` WHERE `placement_id` = $placementId");
        }
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
                $this->grantBonusTile($playerId, TILE_I2);
            }
            if (in_array($type, [CELL_ESCOOTER], true)) {
                $this->grantBonusTile($playerId, TILE_I4);
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
