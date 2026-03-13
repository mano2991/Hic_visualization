# Hi-C Data Website (P0, Adult, Injured)

This folder now includes a ready-to-run web portal for your Hi-C datasets.

## Included files
- `index.html`: website layout
- `styles.css`: page style
- `app.js`: data loading, summary stats, tables, compartment plot, and HiGlass embed URL wiring
- Data folders:
  - `Loop/` (`*_Loop.bed`)
  - `TAD/` (`*_TAD.bed`)
  - `Compartment/` (`*_Compartment.bedGraph`)

## Run locally
From this folder:

```bash
python3 -m http.server 8001
```

Then open:

`http://localhost:8001`

## What the site does
- Shows sample cards for `P0`, `Adult`, and `Injured`
- Provides direct links for `.hic`, `.cool`, loop, TAD, and compartment files
- Adds `Open in Juicebox` buttons for each `.hic`
- Adds embedded Juicebox panel for `.hic` visualization
- Displays counts for loops, TADs, and compartment bins
- Adds embedded HiGlass panel for `.cool` visualization
- Shows compartment signal plot by sample and chromosome
- Shows first 50 rows of loop and TAD files

## Recommended viewer path
If HiGlass `tilesets` returns empty results (e.g., `"count": 0`), use the embedded Juicebox section for `.hic` files.
This does not require Java when using Juicebox Web.

## HiGlass embed requirement
The embedded HiGlass section needs a running HiGlass server URL (default: `http://localhost:8989`).

If you don't have one yet, start a local HiGlass container:

```bash
docker run --rm -p 8989:80 higlass/higlass-docker
```

Then use `http://localhost:8989` in the website's `HiGlass Server` box and click `Load`.

### If you see "View Config not found"
That was from URL-based embedding. The site now uses direct HiGlass API embedding.

If a heatmap still does not appear:
- Use `HiGlass Server = http://localhost:8989`
- Ingest `.cool` files into the HiGlass server and paste the `Tileset UID` in the page
- Click `Load`

## Publish online (GitHub Pages)
1. Push this folder to a GitHub repository.
2. In repository settings, enable **Pages** from the main branch.
3. Your website will be available at your GitHub Pages URL.

Note: `.hic` and `.cool` files can be large; keep an eye on repository size limits.
