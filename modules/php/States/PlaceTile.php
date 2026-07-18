<?php

declare(strict_types=1);

namespace Bga\Games\GreetingsFromEarth\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\GreetingsFromEarth\Game;

class PlaceTile extends GameState {
    function __construct(protected Game $game) {
        parent::__construct(
            $game,
            id: 10,
            type: StateType::MULTIPLE_ACTIVE_PLAYER,
            description: clienttranslate("Other players are placing their tile..."),
            descriptionMyTurn: clienttranslate('${you} must place your tile on the map'),
            updateGameProgression: true
        );
    }

    /**
     * Returns the current round's dice roll and available tile options.
     * This data is sent to all players' clients.
     */
    public function getArgs(): array {
        $diceRoll = (int) $this->game->getGameStateValue("dice_roll");
        $tileOptions = Game::DICE_WHEEL[$diceRoll];

        return [
            "diceRoll" => $diceRoll,
            "tileOptions" => $tileOptions, // e.g. ['L5', 'I4'] etc.
            "alwaysAvailableTiles" => ALWAYS_AVAILABLE_TILES,
        ];
    }

    /**
     * Player submits their tile placement.
     * Called from the client via bgaPerformAction.
     */
    #[PossibleAction]
    public function actPlaceTile(int $currentPlayerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): string|null {
        $diceRoll = (int) $this->game->getGameStateValue("dice_roll");
        $validTiles = array_merge(Game::DICE_WHEEL[$diceRoll], ALWAYS_AVAILABLE_TILES);
        if (!in_array($tileType, $validTiles)) {
            throw new UserException("Invalid tile choice");
        }

        $this->game->placeTile($currentPlayerId, $tileType, $x, $y, $rotation, $mirror);

        $this->notify->all("tilePlaced", clienttranslate('${player_name} places a ${tile_type} tile'), [
            "player_id" => $currentPlayerId,
            "player_name" => $this->game->getPlayerNameById($currentPlayerId),
            "tile_type" => $tileType,
            "x" => $x,
            "y" => $y,
            "rotation" => $rotation,
            "mirror" => $mirror,
            "pending_tiles" => $this->game->getPendingBonusTiles($currentPlayerId),
        ]);

        // Still bonus tiles to place? Stay active — turn not over yet
        if ($this->game->hasPendingBonusTiles($currentPlayerId)) {
            return null;
        }

        // Nothing left to place — end this player's turn
        $this->game->finalizeTurn($currentPlayerId);
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, NewRound::class);
        return null;
    }

    #[PossibleAction]
    public function actPlaceBonusTile(int $currentPlayerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): string|null {
        $pendingTiles = $this->game->getPendingBonusTiles($currentPlayerId);
        if (!in_array($tileType, $pendingTiles)) {
            throw new UserException("Invalid bonus tile choice");
        }
        $this->game->placeBonusTile($currentPlayerId, $tileType, $x, $y, $rotation, $mirror);
        $this->notify->all("bonusTilePlaced", clienttranslate('${player_name} places a bonus ${tile_type} tile'), [
            "player_id" => $currentPlayerId,
            "player_name" => $this->game->getPlayerNameById($currentPlayerId),
            "tile_type" => $tileType,
            "x" => $x,
            "y" => $y,
            "rotation" => $rotation,
            "mirror" => $mirror,
            "pending_tiles" => $this->game->getPendingBonusTiles($currentPlayerId),
        ]);
        if ($this->game->hasPendingBonusTiles($currentPlayerId)) {
            return null;
        }
        $this->game->finalizeTurn($currentPlayerId);
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, NewRound::class);
        return null;
    }

    function zombie(int $playerId): string|null {
        // TODO: implement random valid placement
        $this->gamestate->setPlayerNonMultiactive($playerId, NewRound::class);
        return null;
    }
}
