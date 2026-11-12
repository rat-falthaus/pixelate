import { clusterFromRgb, colorDistance } from '../color';
import type { ColorCluster, PhotoCell } from '../types';
import { K_MEANS_ITERATIONS } from './state';

/** Assign cells to deterministic RGB clusters and sort those clusters by luminance. */
export function quantize(cells: PhotoCell[], requestedCount: number): ColorCluster[] {
  if (cells.length === 0) return [];
  const count = Math.min(Math.max(2, requestedCount), cells.length);
  const centroids: Array<{ r: number; g: number; b: number }> = [
    { r: cells[0].r, g: cells[0].g, b: cells[0].b },
  ];
  const nearestDistance = new Float64Array(cells.length).fill(Infinity);

  for (let cluster = 1; cluster < count; cluster += 1) {
    const latest = centroids[cluster - 1];
    let farthestIndex = 0;
    let farthestDistance = -1;
    for (let index = 0; index < cells.length; index += 1) {
      const distance = colorDistance(cells[index], latest);
      nearestDistance[index] = Math.min(nearestDistance[index], distance);
      if (nearestDistance[index] > farthestDistance) {
        farthestDistance = nearestDistance[index];
        farthestIndex = index;
      }
    }
    centroids.push({
      r: cells[farthestIndex].r,
      g: cells[farthestIndex].g,
      b: cells[farthestIndex].b,
    });
  }

  const assignments = new Int32Array(cells.length);
  for (let iteration = 0; iteration < K_MEANS_ITERATIONS; iteration += 1) {
    const sums = Array.from({ length: count }, () => ({ r: 0, g: 0, b: 0, count: 0 }));
    let changed = false;
    for (let index = 0; index < cells.length; index += 1) {
      let closest = 0;
      let minimumDistance = Infinity;
      for (let cluster = 0; cluster < count; cluster += 1) {
        const distance = colorDistance(cells[index], centroids[cluster]);
        if (distance < minimumDistance) {
          minimumDistance = distance;
          closest = cluster;
        }
      }
      if (assignments[index] !== closest) {
        assignments[index] = closest;
        changed = true;
      }
      sums[closest].r += cells[index].r;
      sums[closest].g += cells[index].g;
      sums[closest].b += cells[index].b;
      sums[closest].count += 1;
    }

    for (let cluster = 0; cluster < count; cluster += 1) {
      const sum = sums[cluster];
      if (!sum.count) continue;
      centroids[cluster] = {
        r: Math.round(sum.r / sum.count),
        g: Math.round(sum.g / sum.count),
        b: Math.round(sum.b / sum.count),
      };
    }
    if (!changed) break;
  }

  const sortedClustersWithIndices = centroids
    .map((centroid, oldIndex) => ({ ...clusterFromRgb(centroid), oldIndex }))
    .sort((left, right) => left.luminance - right.luminance);
  const sortedClusters: ColorCluster[] = sortedClustersWithIndices.map(
    ({ oldIndex: _oldIndex, ...cluster }) => cluster,
  );
  const oldToNew = new Int32Array(sortedClusters.length);
  sortedClustersWithIndices.forEach((cluster, sortedIndex) => {
    oldToNew[cluster.oldIndex] = sortedIndex;
  });
  for (let index = 0; index < cells.length; index += 1) {
    cells[index].clusterIndex = oldToNew[assignments[index]];
  }
  return sortedClusters;
}
