<?php
declare(strict_types=1);

namespace Bga\Games\GreetingsFromEarth;

use Bga\Games\GreetingsFromEarth\States\NewRound;
use Bga\Games\GreetingsFromEarth\States\PlaceTile;
use Bga\Games\GreetingsFromEarth\States\PlaceBonus;
use Bga\Games\GreetingsFromEarth\States\EndScore;

require_once(__DIR__ . '/constants.inc.php');

class Game extends \Bga\GameFramework\Table
{
    // Dice wheel — public so state classes can access it
    public const DICE_WHEEL = [
        1 => ['I4', 'U5'],
        2 => ['U5', 'L4'],
        3 => ['L4', 'T4'],
        4 => ['SZ4', 'T4'],
        5 => ['L5', 'SZ4'],
        6 => ['L5', 'I4'],
    ];

    public function __construct()
{
    parent::__construct();

    $this->initGameStateLabels([
        'current_round' => 10,
        'dice_roll'     => 11,
    ]);
}

    // ===== GAME SETUP =====

    protected function setupNewGame($players, $options = [])
    {
        // Set up player colors
        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];

        foreach ($players as $player_id => $player) {
            $query_values[] = vsprintf("(%s, '%s', '%s')", [
                $player_id,
                array_shift($default_colors),
                addslashes($player["player_name"]),
            ]);
        }

        static::DbQuery(
            sprintf(
                "INSERT INTO `player` (`player_id`, `player_color`, `player_name`) VALUES %s",
                implode(",", $query_values)
            )
        );

        $this->reattributeColorsBasedOnPreferences($players, $gameinfos["player_colors"]);
        $this->reloadPlayersBasicInfos();

        // Init global state values
        $this->setGameStateInitialValue('current_round', 0);
        $this->setGameStateInitialValue('dice_roll', 0);

        // Init player_state rows — one per player
        foreach (array_keys($players) as $player_id) {
            static::DbQuery(
                "INSERT INTO `player_state` (`player_id`) VALUES ('$player_id')"
            );
        }

        // Start the game at NewRound
        return NewRound::class;
    }

    // ===== GAME PROGRESSION =====

    public function getGameProgression(): int
    {
        $currentRound = (int) $this->getGameStateValue('current_round');
        return (int) (($currentRound / TOTAL_ROUNDS) * 100);
    }

    // ===== GET ALL DATAS =====

    protected function getAllDatas(int $currentPlayerId): array
    {
        $result = [];

        $result['players'] = $this->getCollectionFromDb(
            "SELECT `player_id` AS `id`, `player_score` AS `score` FROM `player`"
        );

        $result['currentRound'] = (int) $this->getGameStateValue('current_round');
        $result['diceRoll']     = (int) $this->getGameStateValue('dice_roll');

        $result['coveredCells'] = $this->getCollectionFromDb(
            "SELECT `x`, `y`, `tile_type` FROM `player_cells`
             WHERE `player_id` = '$currentPlayerId'"
        );

        $result['playerState'] = $this->getObjectFromDb(
            "SELECT * FROM `player_state` WHERE `player_id` = '$currentPlayerId'"
        );

        return $result;
    }

    // ===== TILE PLACEMENT =====

    public function placeTile(
        int    $playerId,
        string $tileType,
        int    $x,
        int    $y,
        int    $rotation,
        bool   $mirror
    ): void {
        // TODO: validate placement
        // TODO: insert into player_cells
        // TODO: call checkCollectibles()
    }

    public function placeBonusTile(
        int    $playerId,
        string $tileType,
        int    $x,
        int    $y,
        int    $rotation,
        bool   $mirror
    ): void {
        // TODO: validate placement
        // TODO: insert into player_cells
        // TODO: remove from pending_bonus_tiles
    }

    // ===== BONUS TILE HELPERS =====

    public function hasPendingBonusTiles(int $playerId): bool
    {
        $state = $this->getObjectFromDb(
            "SELECT `pending_bonus_tiles` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        $tiles = json_decode($state['pending_bonus_tiles'], true);
        return count($tiles) > 0;
    }

    public function getPendingBonusTiles(int $playerId): array
    {
        $state = $this->getObjectFromDb(
            "SELECT `pending_bonus_tiles` FROM `player_state`
             WHERE `player_id` = '$playerId'"
        );
        return json_decode($state['pending_bonus_tiles'], true);
    }

    public function clearPendingBonusTiles(int $playerId): void
    {
        static::DbQuery(
            "UPDATE `player_state` SET `pending_bonus_tiles` = '[]'
             WHERE `player_id` = '$playerId'"
        );
    }

    // ===== DEBUG HELPERS =====

    public function debug_goToState(int $state = 20): void
    {
        $this->gamestate->jumpToState($state);
    }

    // ===== DB UPGRADE =====

    public function upgradeTableDb($from_version): void
    {
        // Handle DB migrations here when needed
    }
}