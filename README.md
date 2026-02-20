# TeamNotes — Collaborative Workspace

A real-time collaborative workspace for notes, to-do lists, media, and bookmarks. Built with **React (Vite)** + **Supabase**.

![TeamNotes](https://img.shields.io/badge/React-Vite-blue) ![Supabase](https://img.shields.io/badge/Backend-Supabase-green)

---

## Prerequisites

- **Node.js** ≥ 18 — install from [nodejs.org](https://nodejs.org) or via Homebrew: `brew install node`
- A **Supabase** account and project — [supabase.com](https://supabase.com) (free tier)

---

## 1. Supabase Setup

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Open the **SQL Editor** (left sidebar → SQL Editor)
3. Paste the entire contents of **`supabase_schema.sql`** and click **Run**
4. This creates:
   - `profiles`, `items`, `shared_items` tables with RLS policies
   - A `media` storage bucket with upload/read policies
   - A trigger to auto-create profiles on sign-up
   - Realtime publication for `items` and `shared_items`
5. In **Settings → API**, copy your **Project URL** and **anon public key**

---

## 2. Local Setup

```bash
# Clone / navigate to the project
cd teamnotes

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Edit `.env` and paste your Supabase credentials:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 3. Run Locally

```bash
npm run dev
```

The app opens at **http://localhost:5173**.

---

## 4. Using TeamNotes

| Feature | How |
|---|---|
| **Sign Up** | Open the app → click "Sign Up" → enter email + password |
| **Create Content** | Click the **+** FAB → pick Note / To-Do / Media / Bookmark |
| **Edit** | Click any card → edit title, body, checkboxes, etc. → Save |
| **Share** | Open an item → click 🔗 Share → enter a colleague's email |
| **Real-Time** | Open the same item in two tabs (different users) → changes sync instantly |
| **Profile** | Sidebar → Profile → update display name and avatar |

---

## Project Structure

```
teamnotes/
├── index.html
├── package.json
├── vite.config.js
├── .env.example
├── supabase_schema.sql        ← Run in Supabase SQL Editor
└── src/
    ├── main.jsx                ← Entry point
    ├── App.jsx                 ← Router + layout
    ├── index.css               ← Global design system
    ├── lib/
    │   └── supabaseClient.js   ← Supabase init
    ├── context/
    │   └── AuthContext.jsx      ← Auth state + actions
    ├── hooks/
    │   ├── useRealtimeItem.js   ← Realtime for single item
    │   └── useRealtimeDashboard.js ← Realtime for dashboard
    ├── pages/
    │   ├── Login.jsx + .css
    │   ├── Dashboard.jsx + .css
    │   ├── Profile.jsx + .css
    │   └── ItemDetail.jsx + .css
    └── components/
        ├── Sidebar.jsx + .css
        ├── ItemCard.jsx + .css
        ├── CreateItemModal.jsx + .css
        └── ShareModal.jsx + .css
```

---

## Tech Stack

- **Frontend**: React 18 · Vite · React Router · React Quill · React Icons
- **Backend**: Supabase (Auth · PostgreSQL · Storage · Realtime)
- **Styling**: Vanilla CSS with glassmorphism dark theme

---

## License

MIT
