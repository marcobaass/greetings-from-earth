<?php

declare(strict_types=1);

namespace Bga\Games\GreetingsFromEarth\States;

use Bga\GameFramework\StateType;
use Bga\Games\GreetingsFromEarth\Game;

class NewRound extends \Bga\GameFramework\States\GameState
{
    function __construct(
        protected Game $game,
    ) {
        parent::__construct($game,
            id: 20,
            type: StateType::GAME,
            updateGameProgression: true,
        );
    }

    /**
     * Called automatically when entering this state.
     * Increments the round counter, rolls the dice,
     * reactivates all players, then moves to PlaceTile.
     */
    function onEnteringState(): string
    {
        // Increment round counter
        $currentRound = (int) $this->game->getGameStateValue('current_round');
        $currentRound++;
        $this->game->setGameStateValue('current_round', $currentRound);

        // Roll the dice (1-6)
        $diceRoll = bga_rand(1, 6);
        $this->game->setGameStateValue('dice_roll', $diceRoll);

        // Notify all players about the new round and dice roll
        $this->notify->all('newRound', clienttranslate('--- Round ${round} --- Dice roll: ${dice_roll}'), [
            'round'     => $currentRound,
            'dice_roll' => $diceRoll,
        ]);

        // Reactivate all players for the simultaneous placement phase
        $this->gamestate->setAllPlayersMultiactive();

        // Move to tile placement
        return PlaceTile::class;
    }
}