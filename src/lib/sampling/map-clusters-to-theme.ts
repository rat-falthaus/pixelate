import { colorDistance, hexToRgb } from '../color';
import type { ColorCluster } from '../types';

/** Map photo clusters to nearby brand colors while discouraging repeated assignments. */
export function mapClustersToTheme(clusters: ColorCluster[], colors: string[]): number[] {
  if (!colors.length) return clusters.map(() => 0);
  const palette = colors.map(hexToRgb);
  const used = new Set<number>();
  return clusters.map((cluster) => {
    let bestIndex = 0;
    let bestScore = Infinity;
    palette.forEach((color, index) => {
      const score = colorDistance(cluster, color) + (used.has(index) ? 4500 : 0);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    used.add(bestIndex);
    return bestIndex;
  });
}
