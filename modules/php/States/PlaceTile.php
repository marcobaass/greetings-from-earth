<?php

declare(strict_types=1);

namespace Bga\Games\GreetingsFromEarth\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\GreetingsFromEarth\Game;

class PlaceTile extends GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 10,
            type: StateType::MULTIPLE_ACTIVE_PLAYER,
            description: clienttranslate('Other players are placing their tile...'),
            descriptionMyTurn: clienttranslate('${you} must place your tile on the map'),
            updateGameProgression: true,
        );
    }

    /**
     * Returns the current round's dice roll and available tile options.
     * This data is sent to all players' clients.
     */
    public function getArgs(): array
    {
        $diceRoll = (int) $this->game->getGameStateValue('dice_roll');
        $tileOptions = Game::DICE_WHEEL[$diceRoll];

        return [
            'diceRoll'    => $diceRoll,
            'tileOptions' => $tileOptions,  // e.g. ['L5', 'I4'] etc.
        ];
    }

    /**
     * Player submits their tile placement.
     * Called from the client via bgaPerformAction.
     */
    #[PossibleAction]
    public function actPlaceTile(
        int    $activePlayerId,
        string $tileType,
        int    $x,
        int    $y,
        int    $rotation,
        bool   $mirror,
    ): string|null {
        $diceRoll = (int) $this->game->getGameStateValue('dice_roll');
        $validTiles = Game::DICE_WHEEL[$diceRoll];
        if (!in_array($tileType, $validTiles)) {
            throw new UserException('Invalid tile choice');
        }
    
        $this->game->placeTile($activePlayerId, $tileType, $x, $y, $rotation, $mirror);
    
        $this->notify->all('tilePlaced', clienttranslate('${player_name} places a ${tile_type} tile'), [
            'player_id'   => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'tile_type'   => $tileType,
            'x'           => $x,
            'y'           => $y,
            'rotation'    => $rotation,
            'mirror'      => $mirror,
        ]);
    
        // Check bonus tiles BEFORE deactivating
        $nextState = $this->game->hasPendingBonusTiles($activePlayerId)
            ? PlaceBonus::class
            : NewRound::class;
    
        $this->gamestate->setPlayerNonMultiactive($activePlayerId, $nextState);
        return null;
    }
    
    function zombie(int $playerId): string|null
    {
        // TODO: implement random valid placement
        $this->gamestate->setPlayerNonMultiactive($playerId, NewRound::class);
        return null;
    }
}