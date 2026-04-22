# MAD Studio

Single-page portfolio site for MAD Studio (Originals · Bubble · MAD+ · Vision).

## Stack
- **Frontend:** HTML + ES modules + Vite
- **CMS:** Sanity.io (project `f4pxr4lu`, dataset `production`)
- **Video:** Mux (via `sanity-plugin-mux-input`)
- **Hosting:** Vercel

## Local development

```bash
# install once
npm install
cd sanity && npm install && cd ..

# dev server (site at http://localhost:5173)
npm run dev

# sanity studio (admin at http://localhost:3333)
npm run studio
```

## Seeding / re-seeding

```bash
# Requires SANITY_WRITE_TOKEN in .env.local
npm run seed                  # full seed (uploads all images)
node sanity/scripts/seed.mjs --sections-only   # skip image uploads
```

## Deploy

`vercel.json` is preconfigured for Vite. Push to GitHub → import at https://vercel.com/new.

Environment variables needed on Vercel:
- `SANITY_PROJECT_ID` = `f4pxr4lu`
- `SANITY_DATASET` = `production`
- `SANITY_API_VERSION` = `2024-01-01`
