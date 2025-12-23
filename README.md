# TSX → PDF / PPTX (Offline)

Render any React TSX/JSX component locally and export its exact layout as PDF or PPTX. The app ships with a TypeScript-based in-browser transpiler, runs entirely offline, and captures shapes/text without relying on any AI or remote APIs.

## Running Locally

1. Install dependencies: `npm install`
2. Start the dev server: `npm run dev`
3. Open the shown localhost URL. Upload a `.tsx`/`.jsx` file, choose PDF or PPTX, and export. Nothing leaves your browser.

## How it works

- TSX is transpiled in the browser via the embedded TypeScript compiler (no Babel CDN).
- Components render inside a hidden 1280x720 stage; DOM geometry is mapped to layout elements.
- Exports are generated with jsPDF (A4 landscape) and PptxGenJS (16:9). Standard fonts are used to avoid missing glyphs.
