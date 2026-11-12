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

The build bundles the recognition runtime, its WASM files, and the hand, face, common-object, and silhouette-segmentation models, then precaches the static output in a service worker. Open the hosted app once while online and allow the initial cache installation to finish before taking the device offline. A first visit cannot work without a network connection because the browser must initially fetch the site. After installation, app navigation and bundled processing assets are served locally. Browser camera access still requires a secure context (GitHub Pages HTTPS or localhost).

## Fair / kiosk mode

Live camera and capturing are also available in the normal studio: use **Start live camera** above the artwork, then **Snap & freeze** to save a portrait to the gallery. The same three-second preview and gesture capture work in both modes. **Stop live** releases the camera and keeps the current portrait; **Gallery** opens saved captures. The normal studio keeps its editing layout and does not request fullscreen. The existing **Camera** action still offers a one-shot photo dialog. Opening it releases an active live stream first.

Fair mode presents a camera mosaic fitted to the entire screen. Start the camera, then hold an open palm steady to trigger the translucent 3-2-1 countdown; the captured portrait is previewed for three seconds before live mode resumes. The capture button remains available when gesture recognition is unavailable. Each freeze is saved locally in the gallery, where visitors can select and share multiple images, preview one, or drag it onto the stage. On supported devices, the share sheet sends PNG files; otherwise selected gallery images can be saved locally. Successfully shared selections are removed from local storage after the admin-configured delay.

The live view shows whether hand recognition is loading, ready, or unavailable. Hold either open hand steady for about 0.7 seconds; its size and rotation do not change the gesture rule. Once the countdown starts, lower your hand and pose. A held palm triggers only one shot: lower it before starting another gesture. Stopping the camera or taking a manual photo cancels an outstanding countdown.

The admin camera selector lists built-in and external video inputs; device names appear after camera permission has been granted. Apply settings to restart an active stream on the selected input. A missing selected device is reported rather than silently replaced. Live rendering starts before recognition models finish initializing, and a recognition failure does not stop camera rendering or manual capture.

Images always use centered **cover** framing: they fill the available stage without distortion, with edge cropping when aspect ratios differ. Camera frames are cropped to the actual stage before recognition and pixelation. There are no zoom or image-pan controls. Touch and mouse controls share the same pointer handlers. In the normal studio, text/logo overlays can be positioned with the 3-by-3 controls or dragged using the **Position** tool. Admin position locks apply only in fair mode.

Gallery cards have individual delete buttons and a **Remove all selected** action. Previewed portraits remain unchanged PNGs, not inputs to a second pixelation pass. Deleting a displayed portrait also releases its preview; if a camera is still active, the live view resumes. Sharing snapshots the chosen image without stopping the camera. Cleanup applies only after successful native sharing, not after cancellation or download fallback.

The standard view starts empty; visitors can take a photo or choose one from the device. Live camera processing, sharing, and image processing remain local. There is no upload service or generated share link.

## White-labeling

The initial title, signature, message, palette, and default kiosk permissions live in [`src/lib/config/state.ts`](./src/lib/config/state.ts). The default palette is deliberately generic. Adjust the defaults there before distributing a branded build. The studio settings dialog can also edit the title, signature, default message, palettes, cutoff thresholds, fair-mode settings, visitor permissions, overlay starting positions and locks, gallery cleanup policy, and local admin PIN; those settings are saved in that browser's local storage. Admins can upload an SVG/raster logo and a WOFF/TTF/OTF font. Uploaded assets and captured freezes are stored in that browser's IndexedDB and never sent to a service.

Color, spacing, surface, and typography tokens are defined at the top of [`src/styles/studio.css`](./src/styles/studio.css). Typography uses the local system font stack. Fair-mode visitor permissions are intentionally limited by default; adjust them in the config or in the admin settings.

The admin PIN is a convenience lock for a shared kiosk, not a security boundary: the application is static and runs entirely on the visitor's device. Do not treat it as protection for secrets or privileged server operations.

Logo SVGs are checked for active content and external references, then rasterized locally before they are stored or embedded in exports. Upload only fonts whose licenses permit embedding in exported SVGs.

An uploaded logo replaces typed brand identity in both toolbars and the artwork. Removing it restores the configured **Brand signature**, independently of the application/page title and message. The no-upload signature uses the logo position and lock, and remains available even when the message is turned off.

## How the pixel rules work

1. The source image is sampled into a grid of square cells. The longest grid edge is capped to keep large uploads responsive.
2. MediaPipe FaceDetector (BlazeFace) and ObjectDetector (EfficientDet-Lite0, COCO common-object classes) locate faces, people, and familiar objects locally. Their bounds only guide a bundled MagicTouch segmenter: **foreground follows learned silhouettes, not detection rectangles**. Detection and segmentation use the same cropped/mirrored snapshot and refresh during live capture. Multiple object masks are combined without filling their bounding boxes or internal gaps. Subject focus adjusts silhouette confidence within a bounded range; keep/background brush overrides take precedence.
3. Recognized subjects use a gentler contrast curve and retain shadow/highlight cells so facial/object detail is not cut away. Background cells are probabilistically thinned and their palette colors scattered using a seeded random sequence. If model initialization fails, an explicit warning identifies the heuristic fallback: border-color/edge/saturation saliency with the original negative-space thresholds.
4. Visible cell colors are grouped into luminance-sorted clusters with deterministic farthest-point initialization and iterative refinement. Brand-locked mode maps those tones to the active palette; free mode uses the sampled colors.
5. One compound SVG path is emitted per used color. Optional hairline gaps, a solid or transparent canvas background, manual tile edits, a grid-snapped message, and a generic brand signature are applied at export time.

Segmentation estimates object shapes; it is not pixel-perfect, especially for fine hair, thin features, occlusions, or low-contrast boundaries. A prompt that selects surrounding background is rejected and retried at another location inside the detected region; if no outline is found, the UI says so instead of filling the box. Unsupported custom products are not guaranteed to be recognized; use the mask brush to correct outlines. There is no face identity recognition. Empty detections clear the old foreground mask rather than leaving stale subjects on screen. A transparent export does not embed an opaque canvas background.

## Project map

- `src/pages/index.astro` composes the single-page application from Astro components.
- `src/components/` contains the header, accessible control panel, artwork viewport, and native dialogs.
- `src/lib/types.ts` defines the app and image-processing data contracts.
- `src/lib/{color,config,gesture,recognition,local-store,sampling,svg}.ts` are stable public APIs. Each re-exports single-function implementations from its matching directory, so callers do not need to know internal file layouts.
- `src/lib/config/` owns defaults, validation, and local settings persistence.
- `src/lib/sampling/` handles grid sampling, saliency, and palette quantization.
- `src/lib/gesture/` loads the bundled hand-landmark model and recognizes the open-palm capture gesture.
- `src/lib/recognition/` loads bundled detection/segmentation models, extracts object silhouettes, and resamples their foreground confidence for the tile grid.
- `src/lib/local-store/` stores brand assets and gallery freezes in IndexedDB.
- `src/lib/svg/` generates standalone SVG markup and its grid-aligned overlays.
- `src/scripts/studio.ts` is only the startup entry point and top-level failure notification.
- `src/scripts/studio/` contains browser actions, feature event binders, DOM bindings, and explicit shared state.
- `scripts/build-offline.mjs` generates the content-versioned service worker and precache list.
- `src/styles/studio.css` is the complete local styling layer.

### Studio module structure

Each implementation file exports one named function, with a matching kebab-case filename and a JSDoc description of its responsibility. Short event callbacks remain beside the function that owns them; substantial pointer handlers have their own files. Data-only modules contain shared types, settings, or state rather than functions.

| Directory             | Responsibility                                                             |
| --------------------- | -------------------------------------------------------------------------- |
| `studio/admin/`       | PIN gate, admin form application, palettes, and settings persistence       |
| `studio/artwork/`     | Rendering, sampling inputs, color mapping, brushes, and undo               |
| `studio/branding/`    | Logo validation/rasterization, font loading, and local brand assets        |
| `studio/camera/`      | Camera streams, live rendering, gestures, countdown, and freeze lifecycle  |
| `studio/dom/`         | Required-element lookup and the typed DOM element registry                 |
| `studio/events/`      | Feature-specific listener registration and stage pointer handlers          |
| `studio/gallery/`     | Saved portrait cards, selection, preview, sharing, and thumbnail URLs      |
| `studio/photo/`       | Image decoding, file validation, and active image URL ownership            |
| `studio/recognition/` | Shared local model initialization, live silhouette updates, and photo analysis |
| `studio/sharing/`     | PNG conversion, SVG exports, clipboard, and native sharing                 |
| `studio/state/`       | Artwork/configuration model and transient browser resources                |
| `studio/ui/`          | Initialization, notifications, kiosk status, and workspace permissions     |
| `studio/viewport/`    | Automatic cover-fit transforms and drawer visibility                       |

Initialization binds the events once, restores local assets/gallery data, and applies the workspace controls. Event binders call actions directly; actions use domain APIs for processing and persistence. The state and DOM modules do not import actions, preventing startup dependencies from running UI behavior before the page is initialized.

`state/model.ts` owns the editable artwork and configuration. `state/runtime.ts` owns browser resources such as streams, canvases, animation/timer handles, selection IDs, and object URLs; related lifecycle functions remain responsible for releasing those resources. Domain state such as the IndexedDB connection cache stays within its library directory.

To change behavior, start at the relevant feature binder, then follow its explicitly imported action. Add new substantial actions as documented single-function files, reuse the existing model/DOM registry, and register new controls in the appropriate binder rather than expanding the startup entry point. Keep library helpers independent of browser UI modules.

After changes, run `npm test`, `npm run check`, `npm run lint`, and `npm run build`. The check command generates Astro environment types before invoking TypeScript, so it also works on a clean checkout.

See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md) for bundled model/runtime attribution.

See [`docs/kiosk-upgrade-plan.md`](./docs/kiosk-upgrade-plan.md) for upgrade tickets and acceptance criteria.
