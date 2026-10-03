<?php
// BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
// GreetingsFromEarth implementation : © Marco Baaß <picture@marcobaass.com>
// This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
// See http://en.boardgamearena.com/#!doc/Studio for more information.

declare(strict_types=1);

namespace Bga\Games\GreetingsFromEarth\States;

use Bga\GameFramework\StateType;
use Bga\Games\GreetingsFromEarth\Game;

const ST_END_GAME = 99;

class EndScore extends \Bga\GameFramework\States\GameState {
    function __construct(protected Game $game) {
        parent::__construct($game, id: 98, type: StateType::GAME);
    }

    public function onEnteringState(): int {
        $players = $this->game->loadPlayersBasicInfos();

        foreach (array_keys($players) as $playerId) {
            $player_id = (int) $playerId;

            $row = $this->game->getObjectFromDb("SELECT * FROM player_state WHERE player_id = $player_id");

            $this->playerStats->set("monument_score", (int) $row["monument_score"], $player_id);
            $this->playerStats->set("collection_score", (int) $row["collection_score"], $player_id);
            $this->playerStats->set("monument_collection_score", (int) $row["monument_collection_score"], $player_id);
            $this->playerStats->set("mustsee_score", (int) $row["mustsee_score"], $player_id);
            $this->playerStats->set("ufo_score", (int) $row["ufo_score"], $player_id);
            $this->playerStats->set("street_art_score", (int) $row["street_art_score"], $player_id);

            $monumentCollection = (int) $row["monument_collection_score"];
            $cellsCovered = (int) $this->game->getUniqueValueFromDB("SELECT COUNT(*) FROM player_cells WHERE player_id = $player_id");
            $this->playerScoreAux->set($player_id, $monumentCollection * 1000 + $cellsCovered);
        }

        return ST_END_GAME;
    }
}
