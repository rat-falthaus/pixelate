/**
 * Crop and mirror a camera frame to the viewport aspect ratio at the requested height.
 * @param video Ready camera video; its source pixels are never uploaded.
 * @param canvas Destination canvas, resized before each draw.
 * @param outputHeight Requested output resolution in pixels.
 * @returns False while the camera has not supplied frame dimensions yet.
 */
export function drawCameraFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  outputHeight: number,
): boolean {
  if (!video.videoWidth || !video.videoHeight) return false;
  const aspectRatio = Math.max(
    0.5,
    Math.min(3, window.innerWidth / Math.max(1, window.innerHeight)),
  );
  const sourceAspectRatio = video.videoWidth / video.videoHeight;
  let sx = 0;
  let sy = 0;
  let sourceWidth = video.videoWidth;
  let sourceHeight = video.videoHeight;
  if (sourceAspectRatio > aspectRatio) {
    sourceWidth = video.videoHeight * aspectRatio;
    sx = (video.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = video.videoWidth / aspectRatio;
    sy = (video.videoHeight - sourceHeight) / 2;
  }

  canvas.width = Math.round(outputHeight * aspectRatio);
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare the camera image.');
  context.save();
  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, sx, sy, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  context.restore();
  return true;
}
