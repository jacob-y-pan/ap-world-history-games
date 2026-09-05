# Map Recall

A static AP World History study game for practicing the locations on the supplied map worksheet. Each round highlights an approximate civilization, city, region, coast, or route; the player identifies it by typing a name from the visible word bank.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a deployable static bundle:

```bash
npm run build
```

The finished files are written to `dist/` and can be hosted on any static web host.

## Tests

```bash
npm test
```

The tests cover answer normalization, accepted aliases, retry and scoring behavior, quiz completion, all 25 required prompts, and map-geometry integrity.

## Historical scope

The worksheet combines states and places from different moments between roughly 1200 and 1450. Highlighted boundaries therefore show recognizable core regions rather than borders from one exact year. The unlabeled coastline uses public-domain Natural Earth data distributed through `world-atlas`.