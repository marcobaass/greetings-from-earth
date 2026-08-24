
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- GreetingsFromEarth implementation : © <Your name here> <Your email address here>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

-- Example 1: create a standard "card" table to be used with the "Deck" tools (see example game "hearts"):

-- CREATE TABLE IF NOT EXISTS `card` (
--   `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
--   `card_type` VARCHAR(16) NOT NULL,
--   `card_type_arg` INT NOT NULL,
--   `card_location` VARCHAR(16) NOT NULL,
--   `card_location_arg` INT NOT NULL,
--   PRIMARY KEY (`card_id`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;


-- Example 2: add a custom field to the standard "player" table
-- ALTER TABLE `player` ADD `player_my_custom_field` INT UNSIGNED NOT NULL DEFAULT 0;



-- Player board state — one row per player per covered cell
CREATE TABLE IF NOT EXISTS `player_cells` (
    `player_id`     INT(10)         NOT NULL,
    `x`             TINYINT(2)      NOT NULL,
    `y`             TINYINT(2)      NOT NULL,
    `tile_type`     VARCHAR(4)      NOT NULL,
    PRIMARY KEY (`player_id`, `x`, `y`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `player_placements` (
    `placement_id`  INT(10)         NOT NULL AUTO_INCREMENT,
    `player_id`     INT(10)         NOT NULL,
    `tile_type`     VARCHAR(4)      NOT NULL,
    `x`             TINYINT(2)      NOT NULL,
    `y`             TINYINT(2)      NOT NULL,
    `rotation`      SMALLINT(2)     NOT NULL,
    `mirror`        TINYINT(1)      NOT NULL,
    PRIMARY KEY (`placement_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Player state — one row per player, tracks progress and collected items
CREATE TABLE IF NOT EXISTS `player_state` (
    `player_id`             INT(10)         NOT NULL,
    `last_x`                TINYINT(2)      DEFAULT NULL,
    `last_y`                TINYINT(2)      DEFAULT NULL,
    `last_tile_type`        VARCHAR(4)      DEFAULT NULL,
    `last_rotation`         SMALLINT         NOT NULL DEFAULT 0,
    `last_mirror`           TINYINT         NOT NULL DEFAULT 0,
    `has_started`           TINYINT(1)      NOT NULL DEFAULT 0,
    `currywurst_count`      TINYINT(2)      NOT NULL DEFAULT 0,
    `escooter_count`        TINYINT(2)      NOT NULL DEFAULT 0,
    `ufo_count`             TINYINT(2)      NOT NULL DEFAULT 0,
    `ufo_score`             SMALLINT(2)      NOT NULL DEFAULT 0,
    `collection_count`      TINYINT(2)      NOT NULL DEFAULT 0,
    `collection_score`      TINYINT(2)      NOT NULL DEFAULT 0,
    `street_art_completed`  VARCHAR(64)     NOT NULL DEFAULT '[]',
    `street_art_score`      SMALLINT(2)      NOT NULL DEFAULT 0,
    `street_art_pending`    TINYINT(2)    NOT NULL DEFAULT 0,
    `pending_bonus_tiles`   VARCHAR(128)    NOT NULL DEFAULT '[]',
    `pending_bonus_slots`   TINYINT(2)      NOT NULL DEFAULT 0,
    `mustsee_completed`     VARCHAR(64)     NOT NULL DEFAULT '[]',
    `mustsee_score`         SMALLINT(2)      NOT NULL DEFAULT 0,
    `monument_completed`    VARCHAR(64)     NOT NULL DEFAULT '[]',
    `monument_score`        TINYINT(2)      NOT NULL DEFAULT 0,
    `monument_collection_score` SMALLINT(2)      NOT NULL DEFAULT 0,
    `cells_this_turn`        VARCHAR(512)    NOT NULL DEFAULT '[]',
    `turn_snapshot` TEXT NOT NULL,
    `turn_ended`             TINYINT(1)      NOT NULL DEFAULT 0,
    PRIMARY KEY (`player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Round state — shared across all players
CREATE TABLE IF NOT EXISTS `game_state` (
    `key`           VARCHAR(32)     NOT NULL,
    `value`         VARCHAR(128)    NOT NULL,
    PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;