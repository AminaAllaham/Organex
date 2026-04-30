# Organex

A digital library and resource management tool for self-directed learners. Save, organize, search, and retrieve learning resources (links, articles, videos, PDFs) in one place — with collections, tags, and personal notes.

> Graduation project. Solo developer.

## Tech Stack

**Frontend**
- React 19 + Vite 7
- TanStack Router (file-based routing)
- Tailwind CSS v4
- shadcn/ui (style: new-york)
- React Hook Form + Zod
- Sonner (toasts)

**Backend**
- Firebase Authentication (email/password)
- Cloud Firestore (database)
- Firebase Storage (avatars)
- Express (minimal — admin SDK setup only)

**Hosting**
- Vercel (frontend)
- Firebase (backend services)

## Project Structure

```
Organex/                  npm workspaces monorepo
├── backend/              Express + Firebase Admin
│   ├── index.js          Server entry (port 5000)
│   ├── firebase.js       Firebase Admin SDK init
│   └── .env              Firebase service account credentials
└── frontend/             Vite + React + TanStack Router
    └── src/
        ├── main.jsx
        ├── routes/       File-based routes
        ├── components/   shadcn UI + project components
        ├── firebase/     Firebase client SDK
        ├── hooks/
        └── lib/
```

## Setup

### Prerequisites
- Node.js 18+
- A Firebase project with Authentication, Firestore, and Storage enabled

### Install dependencies
```bash
npm run install:all
```

### Configure environment

Create `backend/.env` with your Firebase Admin credentials:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Create `frontend/.env` with your Firebase client config:
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MSG_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### Run

```bash
npm run dev              # frontend (3000) + backend (5000)
npm run dev:frontend     # frontend only
npm run dev:backend      # backend only
```

## Status

Early development. Core MVP features in progress: authentication, resources CRUD, library view, collections, tags, search, profile.
