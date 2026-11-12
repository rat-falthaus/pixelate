/** Recognize four raised fingers and an extended thumb from normalized hand landmarks. */
export function isOpenPalm(landmarks: Array<{ x: number; y: number }>): boolean {
  if (landmarks.length < 21) return false;
  const extendedFingers = [
    [8, 6],
    [12, 10],
    [16, 14],
    [20, 18],
  ].filter(([tip, joint]) => landmarks[tip].y < landmarks[joint].y - 0.035).length;
  const thumbExtended =
    Math.hypot(landmarks[4].x - landmarks[2].x, landmarks[4].y - landmarks[2].y) > 0.12;
  return extendedFingers >= 4 && thumbExtended;
}
