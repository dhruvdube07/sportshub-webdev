# SportsHub WebDev

This repository contains the SportsHub React app built with Vite.

## Required environment variables

The app uses Supabase and expects the following build-time env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Vercel deployment

If you deploy this repo on Vercel, add the env vars in the Vercel project settings:

1. Open your project in Vercel.
2. Go to `Settings` → `Environment Variables`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Redeploy the app.

### Local development

Create a `.env.local` file in the repo root with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Then run:

```bash
npm install
npm run dev
```

## Run the app

```bash
git clone https://github.com/dhruvdube07/sportshub-webdev.git
cd sportshub-webdev
npm install
npm run dev
```

## Deploying the app

For Vercel, use these settings:

- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `/`

If you built locally and pushed a static `dist` branch, make sure the env vars were set before build.
