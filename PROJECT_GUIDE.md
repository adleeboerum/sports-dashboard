# GameDay Hub — A Plain-English Guide to the Whole Project

> Written for someone who has never written code before. No prior knowledge required.
> If you want the pictures, open `project-map.html` in your browser alongside this guide.

---

## 1. What is this thing?

**GameDay Hub** is a website. When you open it, you see a single page that shows every major sports game happening today — football, basketball, baseball, hockey, soccer — all on one screen. You can click any game to see deeper info: live score, who's starting, the weather at the stadium, current betting odds, and how much tickets cost.

Think of it as a **digital newspaper sports page that updates itself every 30 seconds**.

You can:
- See live scores update automatically.
- "Star" your favorite teams. Their games float to the top.
- Filter the list (e.g., "only show NBA," or "only show live games right now").
- Switch between today's games, a multi-day window, or "next game per team."
- Look at standings (who's winning their league).

---

## 2. The 30-second mental model

Imagine the project as a **restaurant**:

| Restaurant role         | In this project                                             |
| ----------------------- | ----------------------------------------------------------- |
| The dining room (what you see)  | The **components** — buttons, cards, modals on the page.    |
| The waiter (takes your order)   | The **hooks** — they ask for data and bring it to the page. |
| The kitchen (cooks the food)    | The **services** — they call sports websites and get data.  |
| The pantry (ingredients)        | The **types** & **mock data** — the shape of the data and a backup supply when the kitchen is closed. |
| The recipe book (instructions)  | The **utils** — small helpers (e.g., "format this date nicely"). |
| The building itself             | **React + Vite + TypeScript** — the framework that holds everything. |

When you load the page, the waiter (hook) tells the kitchen (service) "I need today's games." The kitchen calls ESPN's website, gets a response, hands it back to the waiter, who hands it to the dining room (components) to display.

---

## 3. The tech stack (in human language)

| Tool          | What it is                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| **React**     | The library that lets us build the page out of reusable pieces ("components") like Lego bricks.                       |
| **TypeScript**| A safer version of JavaScript that catches mistakes before they happen — like spell-check for code.                   |
| **Vite**      | The tool that bundles everything up and runs a local "dev server" so you can preview the site in your browser.        |
| **Tailwind CSS** | A styling system. Instead of writing custom styles, we use tiny pre-made classes (e.g., `text-red-500` = red text). |
| **Axios**     | A small helper that fetches data from the internet (calls APIs).                                                      |
| **Headless UI / Heroicons** | Pre-built modal popups and icons — saves us from drawing them by hand.                                  |

---

## 4. The folder layout (a tour)

Open the project folder and you'll see roughly this:

```
sportsDashboard/
├── public/              ← Static images (favicon, icons) the browser loads as-is
├── src/                 ← All the code lives here
│   ├── main.tsx           ← The first file that runs — it boots the whole app
│   ├── App.tsx            ← The root component — it just shows <Dashboard />
│   ├── index.css          ← Global styles (background color, fonts)
│   ├── pages/
│   │   └── Dashboard.tsx  ← THE MAIN PAGE — assembles every feature together
│   ├── components/        ← Reusable pieces of UI (one file per piece)
│   ├── hooks/             ← Reusable behavior (e.g., "track favorite teams")
│   ├── services/          ← Code that talks to the outside world (ESPN, etc.)
│   ├── types/             ← Definitions of what a "Game" or "Team" looks like
│   ├── utils/             ← Small helper functions (date formatting, etc.)
│   ├── data/
│   │   └── mockData.ts    ← Fake-but-realistic games used when there's no internet/API key
│   └── assets/            ← Project-specific images
├── index.html             ← The single HTML page everything is injected into
├── package.json           ← Lists every library this project depends on
├── README.md              ← Short overview (for developers)
└── PROJECT_GUIDE.md       ← You are reading this
```

### The four "layers" of the code

| Layer        | Folder            | Job                                                            | Example                                     |
| ------------ | ----------------- | -------------------------------------------------------------- | ------------------------------------------- |
| **UI**       | `components/`, `pages/` | Show stuff on the screen. Listen to clicks.              | `GameCard.tsx` displays one game.           |
| **Logic**    | `hooks/`          | Decide what data is needed and remember it.                    | `useFavorites.ts` tracks which teams you starred. |
| **Data**     | `services/`       | Talk to outside servers and return clean data.                 | `sportsApi.ts` fetches today's games.       |
| **Shape**    | `types/`, `data/` | Define what data looks like, plus backup fake data.            | `Game` type, `MOCK_GAMES` list.             |

---

## 5. The components, one by one

A **component** is a self-contained piece of UI. Each one lives in its own file in `src/components/`.

| Component                 | What it shows                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `Sidebar.tsx`             | The left navigation bar — league filters, search box, "favorites only" toggle, sort dropdown.  |
| `GameCard.tsx`            | One game shown as a card (grid view). Delegates to a sport-specific card under the hood.       |
| `GameListItem.tsx`        | One game shown as a row (list view).                                                           |
| `GameDetailsModal.tsx`    | The popup that appears when you click a game — venue, weather, lineups, odds, ticket prices.   |
| `ScoreTicker.tsx`         | The horizontally-scrolling ribbon of live scores at the top.                                   |
| `StandingsPanel.tsx`      | The slide-in panel that shows league standings (W-L records).                                  |
| `FavoriteTeamButton.tsx`  | The little star icon you click to favorite a team.                                             |
| `LeagueFilter.tsx`        | Checkboxes for filtering by NFL/NBA/etc.                                                       |
| `SearchBar.tsx`           | The text box for searching teams by name.                                                      |
| `OddsTable.tsx`           | Inside the modal — a table comparing odds across sportsbooks.                                  |
| `TicketPriceCard.tsx`     | Inside the modal — shows lowest/avg ticket price.                                              |
| `LineupSection.tsx`       | Inside the modal — starters, bench, pitchers, injury notes.                                    |
| `LoadingSpinner.tsx`      | A spinning circle while data loads.                                                            |
| `EmptyState.tsx`          | The "no games found" message when filters return nothing.                                      |
| `cards/*.tsx`             | Sport-specific card layouts (Baseball, Basketball, Football, Hockey, Soccer) + shared bits.    |

### How they nest

```
Dashboard (the page)
├── Sidebar
├── Header (search/filters/view toggle)
├── ScoreTicker
├── [GameCard, GameCard, GameCard, ...]   ← grid of cards
│       └── (sport-specific card inside)
├── GameDetailsModal (appears on click)
│       ├── OddsTable
│       ├── TicketPriceCard
│       └── LineupSection
└── StandingsPanel (slides in on demand)
```

---

## 6. The hooks (the "behavior" layer)

Hooks are reusable units of *behavior*. Components use them like "subscriptions" — "give me the data, and re-render me when it changes."

| Hook                | What it does                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `useGames.ts`       | Fetches games from the API. If we're showing **today**, it auto-refreshes every 30 seconds so live scores stay current. |
| `useFavorites.ts`   | Remembers which team IDs you starred. Saves them in your browser's `localStorage` so they survive refreshing the page.  |
| `useFilters.ts`     | Takes the full list of games and applies your filters (league, search, favorites-only, live-only, sort order).          |
| `useGameSummary.ts` | When you open a game's modal, this fetches deeper info (lineups, pitchers) on demand.                                   |

---

## 7. The services (the "outside world" layer)

These files do the actual talking to the internet. Each handles a different external data source.

| Service             | What it fetches                                                                  | What happens if no API key?              |
| ------------------- | -------------------------------------------------------------------------------- | ---------------------------------------- |
| `sportsApi.ts`      | Today's games + scores from ESPN's public scoreboard endpoints.                  | Uses `MOCK_GAMES` as a fallback.         |
| `oddsApi.ts`        | Betting odds (moneyline, spread, over/under) from The Odds API.                  | Uses fake odds from the mock data.       |
| `ticketsApi.ts`     | Ticket prices from SeatGeek / Ticketmaster.                                      | Uses fake ticket info from the mock data.|
| `weatherApi.ts`     | Forecast at the stadium (for outdoor games) from Open-Meteo.                     | Uses fake weather from the mock data.    |

**Why the fallback?** So the app *just works* the first time you open it, even with no API keys configured. Great for demos.

---

## 8. The types (the data dictionary)

Everything is described in `src/types/index.ts`. The big ones:

- **`Team`** — name, abbreviation, logo URL, primary color, win/loss record.
- **`Player`** — name, position, jersey number, injury status.
- **`Venue`** — stadium name, city, indoor/outdoor.
- **`Game`** — the central object. It bundles together two teams, a start time, a status (`scheduled` / `live` / `final`), scores, the venue, lineups, odds, tickets, and weather.
- **`GameOdds`** — what each sportsbook is offering.
- **`TicketInfo`** — lowest price, average price, link to buy.
- **`FilterState`** — what filters are currently active.
- **`LeagueStandings`** — a league's table of wins and losses.

TypeScript uses these definitions to make sure no one accidentally tries to use a `Team` as a `Game` — it catches the mistake before the code ever runs.

---

## 9. The lifecycle of one click

Here's what happens when you load the page and click on a game card:

1. **Browser opens `index.html`** → which loads `main.tsx` → which renders `<App />` → which renders `<Dashboard />`.
2. **`Dashboard` mounts**. It calls `useGames(...)`, asking for today's games.
3. **`useGames` calls `fetchTodaysGames()`** in `sportsApi.ts`.
4. **`sportsApi.ts` makes 8 parallel network requests** to ESPN (one per league: NBA, NFL, MLB, NHL, etc.).
5. **Responses come back**. The service "normalizes" them — converts each league's slightly-different format into our universal `Game` shape.
6. **Odds and ticket data are merged in** from `oddsApi.ts` and `ticketsApi.ts`.
7. **`Dashboard` receives the games array** and renders one `<GameCard>` per game.
8. **Every 30 seconds**, `useGames` quietly re-fetches in the background so live scores stay fresh.
9. **You click a card** → `setSelectedGame(game)` runs → the `GameDetailsModal` opens.
10. **The modal calls `useGameSummary`** to fetch deeper info (lineups, weather) and shows them when ready.
11. **You click the star** → `useFavorites.toggleFavorite()` updates state AND writes to `localStorage`. Next time you reload, your favorites are still there.

---

## 10. How to run it

From the terminal, inside the project folder:

```bash
npm install         # Install all libraries (only needed the first time)
npm run dev         # Start the development server
```

Then open the URL it prints (usually `http://localhost:5173`) in your browser.

Other useful commands:

| Command            | What it does                                                |
| ------------------ | ----------------------------------------------------------- |
| `npm run build`    | Produces a production-ready bundle in the `dist/` folder.   |
| `npm run preview`  | Serves that production bundle locally so you can test it.   |
| `npm run lint`     | Checks the code for stylistic issues.                       |

---

## 11. Glossary for total beginners

| Term            | What it means in plain English                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| **API**         | A door that another website exposes so programs can ask it for data. Like a drive-thru window for data. |
| **Endpoint**    | A specific URL on that other website that returns specific data (e.g., `…/scoreboard` returns scores).  |
| **Component**   | A reusable piece of UI written in its own file.                                                          |
| **Props**       | The inputs you pass to a component (like arguments to a function).                                       |
| **State**       | Data that a component remembers between user interactions (e.g., which game is selected).               |
| **Hook**        | A function that lets a component use state or other behavior. Names always start with `use`.            |
| **JSX/TSX**     | The HTML-looking syntax inside React code. TSX = JSX + TypeScript.                                       |
| **localStorage**| A tiny key-value storage built into every browser. Survives page refresh. Used here for favorites.       |
| **Mock data**   | Realistic-looking fake data used when real data isn't available.                                         |
| **Modal**       | A popup that floats on top of the page (e.g., game details popup).                                       |
| **Render**      | The act of producing the on-screen visuals from code + data.                                             |
| **Service**     | A module whose job is talking to an external system (like ESPN).                                         |
| **Type**        | A formal definition of what shape a piece of data has — like a schema.                                   |

---

## 12. The mental shortcut

If you only remember one thing, remember this:

> **`pages/Dashboard.tsx` is the boss.** It composes everything. Read it first.
> **`hooks/` knows what to fetch.** **`services/` does the fetching.** **`components/` displays the result.**
> **`types/index.ts` is the dictionary** that everything else consults to agree on shapes.

That's the whole project.
