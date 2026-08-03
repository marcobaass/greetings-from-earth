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

        $state = $this->game->getObjectFromDb(
            "SELECT street_art_pending, street_art_completed FROM player_state WHERE player_id = '$currentPlayerId'"
        );

        $this->notify->all("tilePlaced", clienttranslate('${player_name} places a ${tile_type} tile'), [
            "player_id" => $currentPlayerId,
            "player_name" => $this->game->getPlayerNameById($currentPlayerId),
            "tile_type" => $tileType,
            "x" => $x,
            "y" => $y,
            "rotation" => $rotation,
            "mirror" => $mirror,
            "pending_tiles" => $this->game->getPendingBonusTiles($currentPlayerId),
            "street_art_pending" => (int) $state["street_art_pending"],
            "street_art_completed" => json_decode($state["street_art_completed"] ?? "[]", true) ?? [],
        ]);

        // after place + notify (include street_art_pending in notif args)
        if (!$this->game->finishPlacementOrWait($currentPlayerId)) {
            return null; // stay active
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

        $state = $this->game->getObjectFromDb(
            "SELECT street_art_pending, street_art_completed FROM player_state WHERE player_id = '$currentPlayerId'"
        );

        $this->notify->all("bonusTilePlaced", clienttranslate('${player_name} places a bonus ${tile_type} tile'), [
            "player_id" => $currentPlayerId,
            "player_name" => $this->game->getPlayerNameById($currentPlayerId),
            "tile_type" => $tileType,
            "x" => $x,
            "y" => $y,
            "rotation" => $rotation,
            "mirror" => $mirror,
            "pending_tiles" => $this->game->getPendingBonusTiles($currentPlayerId),
            "street_art_pending" => (int) $state["street_art_pending"],
            "street_art_completed" => json_decode($state["street_art_completed"] ?? "[]", true) ?? [],
        ]);

        if (!$this->game->finishPlacementOrWait($currentPlayerId)) {
            return null;
        }

        $this->game->finalizeTurn($currentPlayerId);
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, NewRound::class);
        return null;
    }

    #[PossibleAction]
    public function actChooseStreetArt(int $currentPlayerId, int $x, int $y): string|null {
        $this->game->chooseStreetArtCell($currentPlayerId, $x, $y);

        $state = $this->game->getObjectFromDb(
            "SELECT `street_art_score`, `street_art_completed`, street_art_pending
            FROM `player_state`
            WHERE `player_id` = '$currentPlayerId'"
        );

        $this->notify->all("streetArtChosen", clienttranslate('${player_name} marks a street art cell'), [
            "player_id" => $currentPlayerId,
            "player_name" => $this->game->getPlayerNameById($currentPlayerId),
            "x" => $x,
            "y" => $y,
            "street_art_pending" => (int) $state["street_art_pending"],
            "street_art_completed" => json_decode($state["street_art_completed"] ?? "[]", true) ?? [],
            "street_art_score" => (int) $state["street_art_score"],
            "pending_tiles" => $this->game->getPendingBonusTiles($currentPlayerId),
        ]);

        if (!$this->game->finishPlacementOrWait($currentPlayerId)) {
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
