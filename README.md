# White-label photo-to-SVG pixel studio

A client-side Astro application for turning a photo into a square-tile SVG mosaic. It is designed for studio use and for a camera-first, touch-friendly fair or kiosk setting. The starting brand is intentionally generic; edit the defaults and visual tokens to make it your own.

## Run locally

Requires Node.js 22.23.4 or newer and npm 9.6.5 or newer.

```sh
npm install
npm run dev
```

Create a production build with `npm run build`. The app uses Astro and TypeScript, but all image processing happens in the visitor's browser. The application does not load fonts, stylesheets, scripts, sample imagery, or other assets from external services. Camera access is optional and requires browser permission plus a secure context (HTTPS or localhost).

## GitHub Pages and offline use

The project is configured for `https://rat-falthaus.github.io/pixelate/`. Pushing to `main` runs [the Pages workflow](./.github/workflows/pages.yml), which checks, builds, and deploys the static site. Enable GitHub Pages with **GitHub Actions** as the build and deployment source in repository settings.

The build bundles the gesture-recognition runtime, its WASM files, and the hand-landmarker model, then precaches the static output in a service worker. Open the hosted app once while online and allow the initial cache installation to finish before taking the device offline. A first visit cannot work without a network connection because the browser must initially fetch the site. After installation, app navigation and bundled processing assets are served locally. Browser camera access still requires a secure context (GitHub Pages HTTPS or localhost).

## Fair / kiosk mode

Fair mode presents a camera mosaic fitted to the entire screen. Start the camera, then hold an open palm steady to trigger the translucent 3-2-1 countdown; the captured portrait is previewed for three seconds before live mode resumes. The capture button remains available when gesture recognition is unavailable. Each freeze is saved locally in the gallery, where visitors can select and share multiple images, preview one, or drag it onto the stage. On supported devices, the share sheet sends PNG files; otherwise selected gallery images can be saved locally. Successfully shared selections are removed from local storage after the admin-configured delay.

The standard view starts empty; visitors can take a photo or choose one from the device. Live camera processing, sharing, and image processing remain local. There is no upload service or generated share link.

## White-labeling

The initial title, signature, message, palette, and default kiosk permissions live in [`src/lib/config.ts`](./src/lib/config.ts). The default palette is deliberately generic. Adjust the defaults there before distributing a branded build. The studio settings dialog can also edit the title, signature, default message, palettes, cutoff thresholds, fair-mode settings, visitor permissions, overlay starting positions and locks, gallery cleanup policy, and local admin PIN; those settings are saved in that browser's local storage. Admins can upload an SVG/raster logo and a WOFF/TTF/OTF font. Uploaded assets and captured freezes are stored in that browser's IndexedDB and never sent to a service.

Color, spacing, surface, and typography tokens are defined at the top of [`src/styles/studio.css`](./src/styles/studio.css). Typography uses the local system font stack. Fair-mode visitor permissions are intentionally limited by default; adjust them in the config or in the admin settings.

The admin PIN is a convenience lock for a shared kiosk, not a security boundary: the application is static and runs entirely on the visitor's device. Do not treat it as protection for secrets or privileged server operations.

Logo SVGs are checked for active content and external references, then rasterized locally before they are stored or embedded in exports. Upload only fonts whose licenses permit embedding in exported SVGs.

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
- `src/lib/{color,config,gesture,local-store,sampling,svg}.ts` are stable public APIs. Each re-exports single-function implementations from its matching directory, so callers do not need to know internal file layouts.
- `src/lib/config/` owns defaults, validation, and local settings persistence.
- `src/lib/sampling/` handles grid sampling, saliency, and palette quantization.
- `src/lib/gesture/` loads the bundled hand-landmark model and recognizes the open-palm capture gesture.
- `src/lib/local-store/` stores brand assets and gallery freezes in IndexedDB.
- `src/lib/svg/` generates standalone SVG markup and its grid-aligned overlays.
- `src/scripts/studio.ts` is only the startup entry point and top-level failure notification.
- `src/scripts/studio/` contains browser actions, feature event binders, DOM bindings, and explicit shared state.
- `scripts/build-offline.mjs` generates the content-versioned service worker and precache list.
- `src/styles/studio.css` is the complete local styling layer.

### Studio module structure

Each implementation file exports one named function, with a matching kebab-case filename and a JSDoc description of its responsibility. Short event callbacks remain beside the function that owns them; substantial pointer handlers have their own files. Data-only modules contain shared types, settings, or state rather than functions.

| Directory | Responsibility |
| --- | --- |
| `studio/admin/` | PIN gate, admin form application, palettes, and settings persistence |
| `studio/artwork/` | Rendering, sampling inputs, color mapping, brushes, and undo |
| `studio/branding/` | Logo validation/rasterization, font loading, and local brand assets |
| `studio/camera/` | Camera streams, live rendering, gestures, countdown, and freeze lifecycle |
| `studio/dom/` | Required-element lookup and the typed DOM element registry |
| `studio/events/` | Feature-specific listener registration and stage pointer handlers |
| `studio/gallery/` | Saved portrait cards, selection, preview, sharing, and thumbnail URLs |
| `studio/photo/` | Image decoding, file validation, and active image URL ownership |
| `studio/sharing/` | PNG conversion, SVG exports, clipboard, and native sharing |
| `studio/state/` | Artwork/configuration model and transient browser resources |
| `studio/ui/` | Initialization, notifications, kiosk status, and workspace permissions |
| `studio/viewport/` | Pan/zoom transforms, artboard fitting, and drawer visibility |

Initialization binds the events once, restores local assets/gallery data, and applies the workspace controls. Event binders call actions directly; actions use domain APIs for processing and persistence. The state and DOM modules do not import actions, preventing startup dependencies from running UI behavior before the page is initialized.

`state/model.ts` owns the editable artwork and configuration. `state/runtime.ts` owns browser resources such as streams, canvases, animation/timer handles, selection IDs, and object URLs; related lifecycle functions remain responsible for releasing those resources. Domain state such as the IndexedDB connection cache stays within its library directory.

To change behavior, start at the relevant feature binder, then follow its explicitly imported action. Add new substantial actions as documented single-function files, reuse the existing model/DOM registry, and register new controls in the appropriate binder rather than expanding the startup entry point. Keep library helpers independent of browser UI modules.

After changes, run `npm run check`, `npm run lint`, and `npm run build`. The check command generates Astro environment types before invoking TypeScript, so it also works on a clean checkout.

See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for bundled model/runtime attribution.
