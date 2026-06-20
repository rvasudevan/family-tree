# Family Tree

An intuitive family tree viewer built from your existing family data export.

**Live site:** [8gk-family-tree.netlify.app](https://8gk-family-tree.netlify.app)

## Quick start

```bash
cd family-tree
npm install
npm run dev:all
```

Open http://localhost:5173. The frontend proxies API requests to the backend on port 3001.

To run frontend and API separately:

```bash
npm run dev:server   # API on :3001
npm run dev          # UI on :5173
```

## Features

- **Tree view** — Interactive pedigree centered on any person, with pan/zoom
- **All members** — Browse and search all family members alphabetically
- **Search** — Press ⌘K (or Ctrl+K) to jump to anyone quickly
- **Detail panel** — Click a person to see parents, spouse, children, and siblings
- **Double-click** any card to re-center the tree on that person
- **Admin mode** — Edit members, link relationships, add/delete people, export CSV

## Data storage

Everyone loads the same family data from the backend. Visitors have a **read-only** view.

Only the admin can change data. Edits are saved to `server/data/family.json` on the server, so all clients see updates after a refresh.

Copy `.env.example` to `.env` and set a strong `ADMIN_PASSWORD` and `JWT_SECRET` before deploying.

## Admin editing

1. Click **Admin** in the header
2. Enter the admin password (from `ADMIN_PASSWORD` in `.env`)
3. Edit any person via the **Edit** button in their detail panel
4. Use **+** to add a new person, **↓** to export CSV, **⏻** to exit admin

Changes save to the server immediately. Use **Export CSV** to download a backup, or run `npm run import-csv` to update the seed file in the repo.

Your seed data lives in `src/data/krishnamachari_family_tree.csv`. To re-import after editing the CSV:

```bash
npm run import-csv
```

By default this reads `~/Downloads/krishnamachari_family_tree.csv`. Pass a custom path:

```bash
npm run import-csv /path/to/your/file.csv
```

## Deploying to Netlify

The app is configured for Netlify: static frontend in `dist/` and API routes as serverless functions. Family data is stored in **Netlify Blobs** in production.

### One-time setup

1. Push this repo to GitHub (if not already).
2. Sign in at [app.netlify.com](https://app.netlify.com) and **Add new site → Import an existing project**.
3. Connect the GitHub repo. Netlify reads `netlify.toml` automatically:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. Under **Site configuration → Environment variables**, add:
   - `ADMIN_PASSWORD` — your admin login password
   - `JWT_SECRET` — a long random string
5. Deploy. The production site is at [8gk-family-tree.netlify.app](https://8gk-family-tree.netlify.app).

### Local Netlify dev

```bash
npm run dev:netlify
```

Runs the Vite app and API functions together at http://localhost:8888.

### Manual CLI deploy

```bash
npx netlify login
npx netlify init          # link or create a site
npx netlify deploy --prod
```

## Deploying with Node (alternative)

Build the frontend and run the API in one process:

```bash
cp .env.example .env   # then edit passwords
npm run build
npm start
```

`npm start` serves the API and static files from one Node process. Use this if you host on a VPS instead of Netlify. Put nginx/Caddy in front and use a persistent volume or backup for `server/data/family.json` so edits survive redeploys.

## Notes

The CSV includes full parent and spouse links across 5 generations, starting from R. Krishnamachari and Kannakavalli.
