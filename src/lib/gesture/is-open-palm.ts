/** Recognize an open palm independently of its size, rotation, or handedness. */
export function isOpenPalm(landmarks: Array<{ x: number; y: number }>): boolean {
  if (landmarks.length < 21) return false;
  const wrist = landmarks[0];
  const palmLength = Math.hypot(landmarks[9].x - wrist.x, landmarks[9].y - wrist.y);
  if (!Number.isFinite(palmLength) || palmLength <= 0) return false;
  const extendedFingers = [
    [5, 6, 8],
    [9, 10, 12],
    [13, 14, 16],
    [17, 18, 20],
  ].every(([base, joint, tip]) => {
    const firstX = landmarks[joint].x - landmarks[base].x;
    const firstY = landmarks[joint].y - landmarks[base].y;
    const lastX = landmarks[tip].x - landmarks[joint].x;
    const lastY = landmarks[tip].y - landmarks[joint].y;
    const lengths = Math.hypot(firstX, firstY) * Math.hypot(lastX, lastY);
    return (
      lengths > 0 &&
      (firstX * lastX + firstY * lastY) / lengths > 0.8 &&
      Math.hypot(landmarks[tip].x - wrist.x, landmarks[tip].y - wrist.y) >
        Math.hypot(landmarks[joint].x - wrist.x, landmarks[joint].y - wrist.y) * 1.15
    );
  });
  const thumbExtended =
    Math.hypot(landmarks[4].x - landmarks[2].x, landmarks[4].y - landmarks[2].y) >
      palmLength * 0.35 &&
    Math.hypot(landmarks[4].x - landmarks[17].x, landmarks[4].y - landmarks[17].y) >
      Math.hypot(landmarks[3].x - landmarks[17].x, landmarks[3].y - landmarks[17].y) * 1.1;
  return extendedFingers && thumbExtended;
}
