# Kiosk upgrade tickets

All recognition and image processing stays on-device. Models and WASM are bundled and precached; an initial online installation is still required for the hosted app.

| Ticket                  | Work and acceptance criteria                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| K1: Drawer and touch    | Put the drawer and its backdrop in the same stacking context. Controls must receive mouse and touch input; backdrop dismisses without obscuring the panel.                                                                                                                                        |
| K2: Branding            | Uploaded logo replaces typed brand identity in the header, kiosk toolbar, welcome prompt, and exported artwork. With no upload, use configured brand-signature text. Message text remains separate.                                                                                               |
| K3: Gallery             | Add per-image deletion and “Remove all selected.” Delete IndexedDB records, selection references, and thumbnail URLs; never re-pixelate already-exported gallery images.                                                                                                                          |
| K4: Cameras             | Use real getUserMedia streams, enumerate video inputs in admin settings, persist camera selection, and restart an active camera when the selection changes. Surface permission, disconnect, and unavailable-device errors.                                                                        |
| K5: Fixed image framing | Remove user zoom and image panning; use centered cover framing on resize. Retain grid-snapped overlay positioning and touch painting. Start empty; never load sample images or auto-preview gallery items.                                                                                        |
| K6: Offline recognition | Bundle MediaPipe FaceDetector and ObjectDetector models for faces, people, and common objects. Analyze the exact cropped/mirrored canvas being sampled, preserve detected regions, and scatter background cells. Apply the same recognition to uploaded photos. Report model failures explicitly. |
| K7: Verification        | Check types, lint, focused behavioral tests, and production build. Exercise drawer touch input, logo fallback/replacement, deletion, two-camera switching, animated camera frames, gallery preview fidelity, and locally served model assets.                                                     |

## Recognition boundaries

The approved scope is faces, people, and common objects supported by the bundled object model. These APIs detect regions; they are not identity recognition, custom-product recognition, or pixel-perfect silhouette segmentation. Repeated detection follows moving subjects in live frames. If no subject is detected, the image is treated as background; if model initialization fails, display an explicit warning and use the existing heuristic subject controls.

## Dependency order

K1-K3 and K5 can be implemented independently after inspection. K6 depends on K4's reliable camera-frame lifecycle. K7 depends on all implementation tickets. Existing single-function modules and public library APIs remain the organizing convention.

## Implementation and verification

K1-K6 are implemented. K7's automated and browser checks passed:

- Five focused regression tests, TypeScript checking, lint, production build, and `git diff --check`.
- Drawer hit-testing, touch drawer/slider input, logo replacement/fallback, and empty startup without sample artwork.
- Animated camera frames and selected-device constraints using browser-injected test streams; previous tracks stopped when switching inputs.
- Individual/bulk gallery deletion, unchanged saved PNG exports, and cancellation of a pending preview when its record is deleted.
- Three-second freeze return, stable share snapshots, cancellation retaining gallery records, and successful sharing removing only the applicable records.
- Centered cover framing at desktop and 390px mobile widths; wheel input did not change image scale.
- Production reload with the local server stopped, followed by face/person/tie detection from cached WASM and models. No external resource requests occurred.

Before a fair, manually accept the build on the actual touchscreen, attached cameras, and operating-system share sheet. Physical webcam hardware and every touch interaction were not exhaustively tested here. Native sharing was exercised with browser test stubs, not a real recipient.
