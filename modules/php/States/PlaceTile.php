<?php
// BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
// GreetingsFromEarth implementation : © Marco Baaß <picture@marcobaass.com>
// This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
// See http://en.boardgamearena.com/#!doc/Studio for more information.

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

    public function getArgs(): array {
        $diceRoll = (int) $this->game->getGameStateValue("dice_roll");
        $tileOptions = Game::DICE_WHEEL[$diceRoll];

        $hasLegalI1MoveByPlayer = [];
        foreach (array_keys($this->game->loadPlayersBasicInfos()) as $playerId) {
            $pid = (int) $playerId;
            $hasLegalI1MoveByPlayer[$pid] = $this->game->hasLegalI1Move($pid);
        }

        return [
            "diceRoll" => $diceRoll,
            "tileOptions" => $tileOptions,
            "alwaysAvailableTiles" => ALWAYS_AVAILABLE_TILES,
            "hasLegalI1MoveByPlayer" => $hasLegalI1MoveByPlayer,
        ];
    }

    /**
     * Confirm placement only. Does NOT end the turn. Does NOT start a new round.
     */
    #[PossibleAction]
    public function actPlaceTile(int $currentPlayerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): string|null {
        if ($this->game->hasTurnEnded($currentPlayerId)) {
            throw new UserException(clienttranslate("You already ended your turn"));
        }
        if ($this->game->isAwaitingTurnConfirm($currentPlayerId)) {
            throw new UserException(clienttranslate("End your turn or undo first"));
        }

        $diceRoll = (int) $this->game->getGameStateValue("dice_roll");
        $validTiles = array_merge(Game::DICE_WHEEL[$diceRoll], ALWAYS_AVAILABLE_TILES);
        if (!in_array($tileType, $validTiles)) {
            throw new UserException(clienttranslate("Invalid tile choice"));
        }

        $this->game->placeTile($currentPlayerId, $tileType, $x, $y, $rotation, $mirror);
        $status = $this->game->afterPlacementStatus($currentPlayerId);
        $scoring = $this->game->getBoardScoringNotifArgs($currentPlayerId);

        $this->notify->all(
            "tilePlaced",
            clienttranslate('${player_name} places a ${tile_type} tile'),
            array_merge(
                [
                    "player_id" => $currentPlayerId,
                    "player_name" => $this->game->getPlayerNameById($currentPlayerId),
                    "tile_type" => $tileType,
                    "x" => $x,
                    "y" => $y,
                    "rotation" => $rotation,
                    "mirror" => $mirror,
                    "pending_tiles" => $status["pending_tiles"],
                    "street_art_pending" => $status["street_art_pending"],
                    "street_art_completed" => $status["street_art_completed"],
                    "awaiting_turn_confirm" => $status["awaiting_turn_confirm"],
                    "can_survive_remaining" => $status["can_survive_remaining"],
                    "has_legal_i1_move" => $status["has_legal_i1_move"] ? 1 : 0,
                ],
                $scoring
            )
        );

        // Stay active until End turn — re-assert multiactive list
        $this->game->keepPlayersInRoundActive(NewRound::class);
        return null;
    }

    #[PossibleAction]
    public function actUndo(int $currentPlayerId): string|null {
        if ($this->game->hasTurnEnded($currentPlayerId)) {
            throw new UserException(clienttranslate("You already ended your turn"));
        }
        if (!$this->game->canUndoTurn($currentPlayerId)) {
            throw new UserException(clienttranslate("Nothing to undo"));
        }

        $this->game->restoreTurnSnapshot($currentPlayerId);

        $coveredCells = $this->game->getObjectListFromDB(
            "SELECT `x`, `y`, `tile_type` FROM `player_cells`
            WHERE `player_id` = '$currentPlayerId'
            ORDER BY `x`, `y`"
        );

        $placements = $this->game->getObjectListFromDB(
            "SELECT `tile_type`, `x`, `y`, `rotation`, `mirror`
            FROM `player_placements`
            WHERE `player_id` = '$currentPlayerId'
            ORDER BY `x`, `y`"
        );

        $playerState = $this->game->getObjectFromDb("SELECT * FROM `player_state` WHERE `player_id` = '$currentPlayerId'");

        $this->notify->all("turnUndone", clienttranslate('${player_name} undoes the turn'), [
            "player_id" => $currentPlayerId,
            "player_name" => $this->game->getPlayerNameById($currentPlayerId),
            "coveredCells" => $coveredCells,
            "placements" => $placements,
            "playerState" => $playerState,
        ]);

        $this->game->keepPlayersInRoundActive(NewRound::class);
        return null;
    }

    /**
     * ONLY this action ends the player's turn. Round advances only when everyone has ended.
     */
    #[PossibleAction]
    public function actEndTurn(int $currentPlayerId): string|null {
        if ($this->game->hasTurnEnded($currentPlayerId)) {
            throw new UserException(clienttranslate("You already ended your turn"));
        }
        if (!$this->game->isAwaitingTurnConfirm($currentPlayerId)) {
            throw new UserException(clienttranslate("Place your tile before ending your turn"));
        }
        if (!$this->game->finishPlacementOrWait($currentPlayerId)) {
            throw new UserException(clienttranslate("You still have tiles or street art to place"));
        }

        $cellsThisTurn = $this->game->getCellsThisTurn($currentPlayerId);
        if (!is_array($cellsThisTurn) || count($cellsThisTurn) === 0) {
            throw new UserException(clienttranslate("You must place a tile before ending your turn"));
        }

        // if (!$this->game->canI1BePlaced($currentPlayerId)) {
        //     throw new UserException(
        //         clienttranslate(
        //             "This placement cannot reach the end of the game with 1-square tiles. Please undo and choose a different placement."
        //         )
        //     );
        // }

        $this->game->finalizeTurn($currentPlayerId);
        $this->game->setTurnEnded($currentPlayerId, true);

        $this->notify->all("turnEnded", clienttranslate('${player_name} ends the turn'), [
            "player_id" => $currentPlayerId,
            "player_name" => $this->game->getPlayerNameById($currentPlayerId),
        ]);

        // Remove only this player from active list. NewRound runs only if nobody left.
        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, NewRound::class);
        return null;
    }

    /**
     * Player has no legal I1 left — retire for remaining rounds; others continue.
     */
    #[PossibleAction]
    public function actEndJourney(int $currentPlayerId): string|null {
        if ($this->game->hasJourneyEnded($currentPlayerId)) {
            throw new UserException(clienttranslate("Your journey has already ended"));
        }
        if ($this->game->hasTurnEnded($currentPlayerId)) {
            throw new UserException(clienttranslate("You already ended your turn"));
        }
        if ($this->game->hasLegalI1Move($currentPlayerId)) {
            throw new UserException(clienttranslate("You still have a legal placement"));
        }

        $this->game->clearPendingBonusTiles($currentPlayerId);
        $this->game->clearTurnPlacementFlags($currentPlayerId);

        $this->game->setJourneyEnded($currentPlayerId, true);
        $this->game->setTurnEnded($currentPlayerId, true);

        $this->notify->all("journeyEnded", clienttranslate('${player_name} has no legal placement left and ends their journey'), [
            "player_id" => $currentPlayerId,
            "player_name" => $this->game->getPlayerNameById($currentPlayerId),
        ]);

        $this->gamestate->setPlayerNonMultiactive($currentPlayerId, NewRound::class);
        return null;
    }

    #[PossibleAction]
    public function actPlaceBonusTile(int $currentPlayerId, string $tileType, int $x, int $y, int $rotation, bool $mirror): string|null {
        if ($this->game->hasTurnEnded($currentPlayerId)) {
            throw new UserException(clienttranslate("You already ended your turn"));
        }
        if ($this->game->isAwaitingTurnConfirm($currentPlayerId)) {
            throw new UserException(clienttranslate("End your turn or undo first"));
        }

        if (!$this->game->isValidBonusTileChoice($currentPlayerId, $tileType)) {
            throw new UserException(clienttranslate("Invalid bonus tile choice"));
        }
        $this->game->placeBonusTile($currentPlayerId, $tileType, $x, $y, $rotation, $mirror);
        $status = $this->game->afterPlacementStatus($currentPlayerId);
        $scoring = $this->game->getBoardScoringNotifArgs($currentPlayerId);

        $this->notify->all(
            "bonusTilePlaced",
            clienttranslate('${player_name} places a bonus ${tile_type} tile'),
            array_merge(
                [
                    "player_id" => $currentPlayerId,
                    "player_name" => $this->game->getPlayerNameById($currentPlayerId),
                    "tile_type" => $tileType,
                    "x" => $x,
                    "y" => $y,
                    "rotation" => $rotation,
                    "mirror" => $mirror,
                    "pending_tiles" => $status["pending_tiles"],
                    "street_art_pending" => $status["street_art_pending"],
                    "street_art_completed" => $status["street_art_completed"],
                    "awaiting_turn_confirm" => $status["awaiting_turn_confirm"],
                    "can_survive_remaining" => $status["can_survive_remaining"],
                    "has_legal_i1_move" => $status["has_legal_i1_move"] ? 1 : 0,
                ],
                $scoring
            )
        );

        $this->game->keepPlayersInRoundActive(NewRound::class);
        return null;
    }

    #[PossibleAction]
    public function actChooseStreetArt(int $currentPlayerId, int $x, int $y): string|null {
        if ($this->game->hasTurnEnded($currentPlayerId)) {
            throw new UserException(clienttranslate("You already ended your turn"));
        }
        if ($this->game->isAwaitingTurnConfirm($currentPlayerId)) {
            throw new UserException(clienttranslate("End your turn or undo first"));
        }

        $this->game->chooseStreetArtCell($currentPlayerId, $x, $y);
        $status = $this->game->afterPlacementStatus($currentPlayerId);

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
            "pending_tiles" => $status["pending_tiles"],
            "awaiting_turn_confirm" => $status["awaiting_turn_confirm"],
            "can_survive_remaining" => $status["can_survive_remaining"],
            "has_legal_i1_move" => $status["has_legal_i1_move"] ? 1 : 0,
        ]);

        $this->game->keepPlayersInRoundActive(NewRound::class);
        return null;
    }

    function zombie(int $playerId): string|null {
        if (!$this->game->hasTurnEnded($playerId)) {
            if ($this->game->isAwaitingTurnConfirm($playerId)) {
                $this->game->finalizeTurn($playerId);
            }
            $this->game->setTurnEnded($playerId, true);
        }
        $this->gamestate->setPlayerNonMultiactive($playerId, NewRound::class);
        return null;
    }
}
