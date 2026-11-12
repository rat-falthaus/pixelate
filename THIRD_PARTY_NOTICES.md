# Third-party notices

## MediaPipe Tasks Vision and Hand Landmarker

This application bundles `@mediapipe/tasks-vision` version `1.2.3` and the MediaPipe Hand Landmarker model for local, offline open-palm recognition.

- Runtime source: <https://github.com/google-ai-edge/mediapipe>
- Model source: <https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task>
- License: Apache License 2.0; see [`public/licenses/Apache-2.0.txt`](./public/licenses/Apache-2.0.txt).
- Bundled model SHA-256: `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1`

## Face and common-object detection models

Both unmodified models run locally through the bundled MediaPipe Tasks Vision runtime. There are no model downloads from third-party origins at runtime.

### BlazeFace short-range, float16, version 1

- Model source: <https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite>
- Model card and license declaration: <https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf>
- License: Apache License 2.0; see [`public/licenses/Apache-2.0.txt`](./public/licenses/Apache-2.0.txt).
- SHA-256: `b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`

### EfficientDet-Lite0, int8, version 1

- Model source: <https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite>
- Official model distribution/license: <https://www.kaggle.com/models/tensorflow/efficientdet/TfLite/lite0-int8>
- License: Apache License 2.0; see [`public/licenses/Apache-2.0.txt`](./public/licenses/Apache-2.0.txt).
- SHA-256: `0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb`
- Trained on COCO's common-object categories, including people; not a custom-product classifier.

## MagicTouch silhouette segmentation, float32, version 1

The unmodified model runs locally using MediaPipe's `InteractiveSegmenterLegacy` API, which supports this compact model format. Detected regions supply point prompts; only the model's foreground confidence masks reach the pixel sampler.

- Model source: <https://storage.googleapis.com/mediapipe-models/interactive_segmenter/magic_touch/float32/1/magic_touch.tflite>
- Model card and license declaration: <https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MagicTouch.pdf>
- License: Apache License 2.0; see [`public/licenses/Apache-2.0.txt`](./public/licenses/Apache-2.0.txt).
- SHA-256: `e24338a717c1b7ad8d159666677ef400babb7f33b8ad60c4d96db4ecf694cd25`
- Approximately 6 MB, bundled and precached with the application; no external model requests or image uploads.
