# GameDay Hub

A modern, real-time sports dashboard showing today's games across all major leagues — with live scores, betting odds, ticket prices, lineups, and favorite team tracking.

## Features

- **Today's Games** — NFL, NBA, MLB, NHL, NCAAF, NCAAB, MLS, EPL and more
- **Live Scores** — Auto-refreshes every 30 seconds; live games pulse green
- **Favorite Teams** — Star any team; games with favorites float to the top. Saved to `localStorage`.
- **Game Details Modal** — Full matchup info, venue, weather (outdoor games), lineups/injuries, pitcher matchups, odds comparison, and ticket prices
- **Betting Odds** — Moneyline, spread, and over/under from multiple sportsbooks (informational only)
- **Ticket Prices** — Lowest/average price and direct link to buy
- **Filters** — By league, team search, favorites-only, live-only, and sort by time/league/odds/tickets
- **Mock Data Fallback** — Works out of the box with no API keys

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

| Variable | Service | Notes |
|---|---|---|
| `VITE_API_SPORTS_KEY` | [API-Sports](https://www.api-sports.io/) | Football, basketball, etc. |
| `VITE_ODDS_API_KEY` | [The Odds API](https://the-odds-api.com/) | Live betting odds |
| `VITE_SEATGEEK_CLIENT_ID` | [SeatGeek](https://platform.seatgeek.com/) | Ticket prices |
| `VITE_TICKETMASTER_API_KEY` | [Ticketmaster](https://developer.ticketmaster.com/) | Ticket prices |

**All keys are optional.** When none are present, the app uses realistic mock data so every feature still works.

## How Mock Data Works

`src/data/mockData.ts` contains 8 games across NBA, MLB, NHL, NFL, NCAAB, MLS, and EPL with realistic scores, lineups, odds from 3 sportsbooks, and ticket info. The service layer (`src/services/sportsApi.ts`) falls back to this data automatically when no API keys are configured.

## Project Structure

```
src/
  components/       # Reusable UI components
    GameCard          GameDetailsModal  OddsTable  TicketPriceCard
    FavoriteTeamButton  LeagueFilter  SearchBar  LoadingSpinner
    EmptyState  Sidebar
  pages/
    Dashboard       # Main page composing all features
  services/
    sportsApi.ts    # ESPN / API-Sports integration
    oddsApi.ts      # The Odds API integration
    ticketsApi.ts   # SeatGeek integration
  hooks/
    useGames        # Game data fetching + 30s live refresh
    useFavorites    # localStorage favorite team management
    useFilters      # Client-side filtering, search, and sort
  types/index.ts    # All TypeScript interfaces (Team, Game, Odds, etc.)
  utils/formatters.ts
  data/mockData.ts
```

## Tech Stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`
- [Headless UI](https://headlessui.com/) — animated modals and dialogs
- [Heroicons](https://heroicons.com/) — icons
- [Axios](https://axios-http.com/) — HTTP requests
- `localStorage` — favorite team persistence (no backend required)

## Supported APIs

| API | What it powers |
|---|---|
| ESPN (public, no key) | Scores, schedules for NBA/NFL/MLB/NHL/NCAAB |
| API-Sports | Extended sports data |
| The Odds API | Live moneyline, spread, over/under from DraftKings/FanDuel/BetMGM |
| SeatGeek | Ticket prices and availability |
| Ticketmaster | Ticket prices and availability |

## Future Improvements

- WebSocket real-time score updates
- Push notifications for favorite team games
- Historical scores and standings
- Player stats and profiles
- More leagues: CFL, La Liga, Bundesliga, F1
- Cloud-synced favorites with auth
- Dark/light theme toggle
- PWA support
