# Baseline: ATP points tracker

A dashboard for the men's ATP singles ranking:

- **Rankings**: the current list, where the top 20 earned their points, and each player's next points to drop.
- **Player pages**: every counting result from the last 52 weeks, with the match-by-match path through each draw.
- **Points to defend**: for any player, the events in the next 52 weeks where last year's points come off his total, when they drop, and a chart of his points "floor" (what he keeps if he earns nothing more) with the rank it would give.

Built with Next.js, TypeScript and Tailwind CSS. Every page is generated statically from `data/atp.json`.

## Data

`npm run sync-data` downloads [Jeff Sackmann's tennis_atp](https://github.com/JeffSackmann/tennis_atp) CSVs (rankings, players, tour-level matches for the ranking season and the one before) and writes `data/atp.json`. The **Refresh ATP data** GitHub Action runs this daily and commits the file when it changes, which redeploys the site on hosts that build from `main`.

- Those files don't carry ranking points per event, so points are computed from the round reached and the current ATP points table (`lib/points.ts`). Grand Slams, Masters 1000, ATP 500, ATP 250 and the ATP Finals are tracked; the rest of each official total (mostly Challengers) is shown as "other".
- Drop dates are estimates: the Monday after next year's edition of the event ends.
- The data is community-maintained and can lag the official rankings. Every page shows the ranking date it uses. To use another copy with the same layout (for example a fork), set the `ATP_DATA_BASE_URL` repository variable.
- Sackmann's data is licensed CC BY-NC-SA 4.0, so this app must stay non-commercial while it uses it.

The repository starts with a demo dataset of fictional players (`npm run demo-data`) so the app runs offline; a banner says so until real data is loaded.

## Develop

```bash
npm install
npm run sync-data   # or: npm run demo-data
npm run dev
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

## Deploy

Import the repository into [Vercel](https://vercel.com/new) with the default Next.js settings. No environment variables are needed.
