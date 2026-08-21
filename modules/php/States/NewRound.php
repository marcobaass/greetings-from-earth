<?php

declare(strict_types=1);

namespace Bga\Games\GreetingsFromEarth\States;

use Bga\GameFramework\StateType;
use Bga\Games\GreetingsFromEarth\Game;

class NewRound extends \Bga\GameFramework\States\GameState {
    function __construct(protected Game $game) {
        parent::__construct($game, id: 20, type: StateType::GAME, updateGameProgression: true);
    }

    /**
     * Runs only after EVERY player has pressed End turn.
     */
    function onEnteringState(): string {
        $players = $this->game->loadPlayersBasicInfos();

        foreach (array_keys($players) as $playerId) {
            $pid = (int) $playerId;
            $this->game->setTurnEnded($pid, false);
            $this->game->clearCellsThisTurn($pid);
            $this->game->saveTurnSnapshot($pid);
        }

        $currentRound = (int) $this->game->getGameStateValue("current_round");
        if ($currentRound >= TOTAL_ROUNDS) {
            return EndScore::class;
        }
        $currentRound++;
        $this->game->setGameStateValue("current_round", $currentRound);

        $diceRoll = bga_rand(1, 6);
        $this->game->setGameStateValue("dice_roll", $diceRoll);

        $this->notify->all("newRound", clienttranslate('--- Round ${round} --- Dice roll: ${dice_roll}'), [
            "round" => $currentRound,
            "dice_roll" => $diceRoll,
        ]);

        $this->gamestate->setAllPlayersMultiactive();

        return PlaceTile::class;
    }
}
