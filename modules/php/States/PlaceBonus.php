<?php

declare(strict_types=1);

namespace Bga\Games\GreetingsFromEarth\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\GreetingsFromEarth\Game;

class PlaceBonus extends GameState {
    function __construct(protected Game $game) {
        parent::__construct(
            $game,
            id: 30,
            type: StateType::MULTIPLE_ACTIVE_PLAYER,
            description: clienttranslate("Other players are placing their bonus tile..."),
            descriptionMyTurn: clienttranslate('${you} must place your bonus tile on the map')
        );
    }

    /**
     * Returns the pending bonus tiles for the current player.
     */
    public function getArgs(int $currentPlayerId): array {
        $pendingTiles = $this->game->getPendingBonusTiles($currentPlayerId);
        return [
            "pendingTiles" => $pendingTiles,
        ];
    }

    /**
     * Player places one of their pending bonus tiles.
     */
    #[PossibleAction]
    public function actPlaceBonusTile(int $currentPlayerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): string|null {
        // Validate that this tile is actually pending for this player
        $pendingTiles = $this->game->getPendingBonusTiles($currentPlayerId);
        if (!in_array($tileType, $pendingTiles)) {
            throw new UserException("Invalid bonus tile choice");
        }

        // Place it
        $this->game->placeBonusTile($currentPlayerId, $tileType, $x, $y, $rotation, $mirror);

        // Notify all players
        $this->notify->all("bonusTilePlaced", clienttranslate('${player_name} places a bonus ${tile_type} tile'), [
            "player_id" => $currentPlayerId,
            "player_name" => $this->game->getPlayerNameById($currentPlayerId),
            "tile_type" => $tileType,
            "x" => $x,
            "y" => $y,
            "rotation" => $rotation,
            "mirror" => $mirror,
        ]);

        // If this player still has more pending tiles, stay in this state
        if ($this->game->hasPendingBonusTiles($currentPlayerId)) {
            return null;
        }

        // No more pending tiles — mark player as done
        $this->game->finalizeTurn($currentPlayerId);
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, NewRound::class);
        return null;
    }

    public function onEnteringState() {
        $players = $this->game->loadPlayersBasicInfos();

        $withBonus = [];

        foreach ($players as $playerId => $info) {
            if ($this->game->hasPendingBonusTiles((int) $playerId)) {
                $withBonus[] = (int) $playerId;
            }
        }
        if (count($withBonus) === 0) {
            return NewRound::class;
        }

        $this->gamestate->setPlayersMultiactive($withBonus, NewRound::class);
        return null;
    }

    /**
     * Zombie player — skip bonus tile placement.
     */
    function zombie(int $playerId): string|null {
        // Clear pending tiles and mark as done
        $this->game->clearPendingBonusTiles($playerId);
        $this->gamestate->setPlayerNonMultiactive($playerId, NewRound::class);
        return null;
    }
}
