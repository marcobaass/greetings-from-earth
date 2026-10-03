# Greetings from Earth (BGA)

Board Game Arena adaptation of **Greetings from Earth** (Sloppy Games).

Studio project: `greetingsfromearth`  
© Marco Baaß & Benno Thönelt

## Stack

- PHP game logic: `modules/php/` (`Game.php`, state classes, helpers)
- TypeScript UI: `src/ts/` → built to `modules/js/Game.js`
- Styles: `greetingsfromearth.css`
- Schema: `dbmodel.sql`
- Meta: `gameinfos.jsonc`, `stats.jsonc`, Game Metadata Manager (box/icon/publisher)

## Develop

```bash
npm install
npm run build:ts    # rollup → modules/js/Game.js
# optional: npm run watch:ts
```
