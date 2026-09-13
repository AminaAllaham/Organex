# Organex

Organex is a personal digital learning library that helps users save, organize, search, and retrieve learning resources such as links, articles, videos, notes, and PDFs.

This repository contains the Organex graduation project and is maintained as an npm workspace with a React/Vite frontend and Vercel serverless functions.

## Features


- Firebase email/password authentication
- User profile and onboarding flow
- Resource creation, editing, deletion, and browsing
- Link, article, video, note, and other resource types
- Secure private PDF resources
- Collections and collection detail pages
- Tags and tag detail pages
- Search across:
  - Resource title
  - Description
  - Personal notes
  |-- api/                         Vercel serverless functions
- React 19
- Vite 7
- TanStack Router with file-based routing
- Tailwind CSS v4
- shadcn/ui and Radix UI primitives
- React Hook Form
- Zod
- Sonner
- Lucide React

### Platform and Services


- Firebase Authentication
- Cloud Firestore
- Cloudinary for avatar and private PDF assets
- Vercel Serverless Functions for authenticated Cloudinary operations
- Vercel Hosting for the frontend and functions

### Testing


- Vitest
- React Testing Library (installed for component-level testing)

## Architecture

Organex is a client-rendered React SPA deployed to Vercel.

- Firebase Authentication manages user sign-in and sign-up.
- Cloud Firestore stores user profiles and user-owned resource, collection, and tag metadata.
- Cloudinary stores uploaded avatar images and private PDF assets.
- Vercel functions under `api/` verify Firebase ID tokens and perform server-side Cloudinary operations.
- The frontend calls Firestore directly through the Firebase client SDK for user-owned application data.
- There is no persistent Node.js or Express API server.

## Secure PDF Flow

PDF operations are kept behind authenticated serverless functions:

1. An authenticated user requests a Cloudinary upload signature.
2. The PDF is uploaded to a user-scoped Cloudinary path using authenticated raw delivery.
3. The resource stores PDF metadata in Firestore and associates the asset with the Firebase UID.
4. Opening or downloading a PDF requests a short-lived signed URL from the Vercel function.
5. PDF deletion validates ownership, removes the Cloudinary asset, and then removes the Firestore resource.
6. If resource creation fails after upload, the cleanup function removes an unreferenced Cloudinary asset.

The serverless functions validate Firebase ID tokens, resource ownership, user-scoped Cloudinary paths, and secure PDF metadata. Secrets are never committed to the repository.

## Project Structure

```text
Organex/
|-- api/                         Vercel serverless functions
|   |-- cloudinary-signature.js  Authenticated PDF upload signatures
|   |-- pdf-access.js            Temporary PDF view/download URLs
|   |-- pdf-cleanup.js           Cleanup for failed PDF creation
|   `-- pdf-delete.js            Secure PDF and resource deletion
|-- frontend/
|   |-- public/                  Static assets and web manifest
|   `-- src/
|       |-- components/          Auth, library, and shadcn/ui components
|       |-- firebase/             Firebase client initialization
|       |-- hooks/                Shared React hooks
|       |-- lib/                  Auth, profile, resource, search, tag, and collection services
|       `-- routes/               TanStack Router file-based routes
|-- firebase.json                Firebase project configuration
|-- firestore.rules              User ownership and resourceType update rules
|-- vercel.json                  Vercel build, SPA rewrite, and output configuration
`-- package.json                 Root npm workspace and project scripts
```

Important application routes include `/`, `/library`, `/favorites`, `/search`, `/collections`, `/tags`, `/profile`, `/onboarding`, `/resources/new`, and resource, collection, and tag detail routes.

## Local Development

### Prerequisites

- Node.js 20.19+ or 22.12+ (required by Vite 7)
- npm
- A Firebase project with Email/Password Authentication and Cloud Firestore enabled
- A Cloudinary account configured for the application upload and authenticated PDF flows

### Installation

From the repository root:

```bash
npm install
```

The root project uses npm workspaces and installs dependencies for `frontend/`.

### Environment Variables

Create `frontend/.env` for Firebase client configuration and the public Cloudinary upload values used by the frontend:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MSG_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=
```

The application does not use Firebase Storage for file storage. The Firebase storage bucket value is part of the standard Firebase client configuration, while uploaded avatars and PDFs are handled through Cloudinary.

Configure these server-side environment variables in the Vercel project for the functions under `api/`:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Do not commit `.env` files, service-account keys, private keys, or Cloudinary secrets.

### Run the Development Server

```bash
npm run dev
```

This starts the Vite development server for the frontend. The configured default port is `3000`; set `PORT` when a different local port is required.

### Build and Preview

```bash
npm run build
npm --workspace frontend run preview
```

The production build is written to `frontend/dist`.

## Testing

Run the complete automated test suite from the repository root:

```bash
npm test
```

The tests use mocked Firebase/Firestore and browser APIs. They do not require live Firebase, Cloudinary, Vercel, or production credentials.

Current coverage includes resource service behavior, star toggling, Favorites filtering semantics, Search matching and combined filters, collection/tag cleanup behavior, and secure PDF request guards.

## Deployment

The project is configured for Vercel deployment:

- Install command: `npm install`
- Build command: `npm run build`
- Development command: `npm run dev`
- Output directory: `frontend/dist`
- SPA fallback: all paths rewrite to `frontend/index.html`

Set both the frontend variables and server-side function secrets in the Vercel project before deployment. Firebase Authentication, Firestore, and Cloudinary must also be configured for the deployed domains.
