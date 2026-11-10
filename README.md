# Jungle Escape: Temple Crash

A standalone crash game from the Gold Fever Crash Collection, built with React + TypeScript.
This folder holds only Jungle Escape; the app opens straight into the game.

## How it works

The GameEngineAPI runs the game. It draws every crash point (EasyRNG, Target model, 3% house edge,
top multiplier 10,000×, growth 0.09), runs the rounds, takes bets, pays cash-outs and keeps the wallet.
This app follows it over SignalR (`/livecrashhub`) and draws what happens.

The API lives in `GameEngineAPI/`, a git submodule (branch `feature/jungle-escape-crash`).
After cloning: `git submodule update --init`.

## Run it locally

1. Give the API an in-memory wallet. Create `GameEngineAPI/appsettings.Development.json` (it is gitignored):

   ```json
   { "ConnectionStrings": { "DefaultConnection": "" } }
   ```

2. Start the API:

   ```bash
   cd GameEngineAPI
   DOTNET_ROLL_FORWARD=Major ASPNETCORE_ENVIRONMENT=Development dotnet run --no-launch-profile --urls http://localhost:5003
   ```

3. Start the game:

   ```bash
   npm install
   npm run dev      # http://localhost:5173
   ```

   The game talks to `http://localhost:5003`. For another address set `VITE_GAME_API_URL`,
   e.g. `VITE_GAME_API_URL=http://localhost:5099 npm run dev`.

`play.html` is a single-file build. It also needs the API, and must be served from `localhost`
(e.g. `http://localhost:5173/play.html`): the API refuses pages opened straight from disk.

```bash
npm run build    # production build in dist/
npm run typecheck
```

## Files

| Path | What it does |
| --- | --- |
| `src/scenes/jungle-escape.js` | Directs the scene: the run, trap timing, the split, crash and cash-out |
| `src/scenes/jungle/` | The art: `biomes.js` (jungle, Serpent Hall, Sun Gate), `hero.js` (the explorer), `traps.js`, `items.js` (coins, gems, relics), `portal.js` (the split), `collapse.js` (the crash), `relics.js`, `kit.js` (painting brushes) |
| `src/scenes/index.js` | Registers the scene (add more imports here to bundle more games) |
| `src/api/liveCrash.ts` | SignalR client for the GameEngineAPI live crash hub |
| `src/engine/core.js` | Shared drawing utilities and particles |
| `src/engine/art.js` | Art toolkit: textures, sprites, clouds, lighting, grain, characters |
| `src/game/controller.ts` | Follows the server's rounds and bets, two bet slots, simulated players (for show), draws each frame |
| `src/game/wallet.ts` | Mirrors the server balance, plus session stats |
| `src/game/audio.ts` | Synthesised sound effects, jungle ambience and an original adaptive music score (no audio files) |
| `src/components/` | React UI: game view, bet panels, how to play, provably fair |

## Rules

- The multiplier grows as `m(t) = e^(0.09·t)`. The server picks one crash point per round.
- Each round's server seed hash is shown before it starts. Old seeds are revealed when the server replaces them.
- The split at 1.80×: choosing the Serpent Hall or the Sun Gate is only for show. Both share the round's crash point.
- The other players on screen are simulated, for show.
