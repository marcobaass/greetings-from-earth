<?php

declare(strict_types=1);

namespace Bga\Games\GreetingsFromEarth\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\GreetingsFromEarth\Game;

/**
 * Legacy unused state — must never auto-jump to NewRound.
 * Bonus placement lives in PlaceTile.
 */
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

    public function getArgs(int $currentPlayerId): array {
        return [
            "pendingTiles" => $this->game->getPendingBonusTiles($currentPlayerId),
        ];
    }

    #[PossibleAction]
    public function actPlaceBonusTile(int $currentPlayerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): string|null {
        throw new UserException("Use PlaceTile bonus flow");
    }

    public function onEnteringState() {
        // Never start a new round from here — bounce back to PlaceTile
        $this->gamestate->setAllPlayersMultiactive();
        return PlaceTile::class;
    }

    function zombie(int $playerId): string|null {
        $this->gamestate->setPlayerNonMultiactive($playerId, PlaceTile::class);
        return null;
    }
}
