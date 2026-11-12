# White-label photo-to-SVG pixel studio

A client-side Astro application for turning a photo into a square-tile SVG mosaic. It is designed for both studio use and a touch-friendly fair or kiosk setting. The starting brand is intentionally generic; edit the defaults and visual tokens to make it your own.

## Run locally

Requires Node.js 22.23.4 or newer and npm 9.6.5 or newer.

```sh
npm install
npm run dev
```

Create a production build with `npm run build`. The app uses Astro and TypeScript, but all image processing happens in the visitor's browser. The application does not load fonts, stylesheets, scripts, sample imagery, or other assets from external services. Camera access is optional and requires browser permission plus a secure context (HTTPS or localhost).

## White-labeling

The initial title, signature, message, palette, and default kiosk permissions live in [`src/lib/config.ts`](./src/lib/config.ts). The default palette is deliberately generic. Adjust the defaults there before distributing a branded build. The studio settings dialog can also edit the title, signature, default message, palettes, cutoff thresholds, fair-mode settings, visitor permissions, and local admin PIN; those settings are saved in that browser's local storage.

Color, spacing, surface, and typography tokens are defined at the top of [`src/styles/studio.css`](./src/styles/studio.css). Typography uses the local system font stack. The three demo illustrations are drawn with the Canvas API in [`src/scripts/studio.ts`](./src/scripts/studio.ts), so sample artwork is not a downloaded resource.

The admin PIN is a convenience lock for a shared kiosk, not a security boundary: the application is static and runs entirely on the visitor's device. Do not treat it as protection for secrets or privileged server operations.

## How the pixel rules work

1. The source image is sampled into a grid of square cells. The longest grid edge is capped to keep large uploads responsive.
2. A smoothed subject score combines difference from the image-border color, local luminance edges, a center/lower-frame prior, and color saturation. The threshold and brush-painted keep/background overrides control whether a cell is treated as subject or loose background.
3. Subject cells receive an optional contrast curve; dark and bright cells beyond the configured luminance limits become transparent negative-space cutouts. Background cells are probabilistically thinned using a seeded random sequence.
4. Visible cell colors are grouped into luminance-sorted clusters with deterministic farthest-point initialization and iterative refinement. Brand-locked mode maps those tones to the active palette; free mode uses the sampled colors.
5. One compound SVG path is emitted per used color. Optional hairline gaps, a solid or transparent canvas background, manual tile edits, a grid-snapped message, and a generic brand signature are applied at export time.

Foreground detection is a lightweight heuristic, not machine-learning segmentation. It works best with a distinct subject and background; use the mask brush to correct ambiguous regions. A transparent export does not embed an opaque canvas background.

## Project map

- `src/pages/index.astro` composes the single-page application from Astro components.
- `src/components/` contains the header, accessible control panel, artwork viewport, and native dialogs.
- `src/lib/types.ts` defines the app and image-processing data contracts.
- `src/lib/config.ts` owns defaults, validation, and local persistence.
- `src/lib/sampling.ts` handles grid sampling, saliency, and palette quantization.
- `src/lib/svg.ts` generates safe, standalone SVG markup.
- `src/scripts/studio.ts` binds browser events and connects the interface to the domain modules.
- `src/styles/studio.css` is the complete local styling layer.
