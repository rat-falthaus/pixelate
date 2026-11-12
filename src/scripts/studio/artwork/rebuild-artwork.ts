import { getActiveTheme } from '../../../lib/config';
import { mapClustersToTheme, sampleImage } from '../../../lib/sampling';
import { elements } from '../dom/elements';
import { model } from '../state/model';
import { runtime } from '../state/runtime';
import { notify } from '../ui/notify';
import { fitArtboard } from '../viewport/fit-artboard';
import { getSamplingOptions } from './get-sampling-options';
import { renderArtwork } from './render-artwork';
import { renderMapping } from './render-mapping';

/** Resample the source image, preserve compatible palette mappings, and redraw the artwork. */
export function rebuildArtwork(fit = false): void {
  if (!model.image || runtime.previewFreeze) return;
  try {
    const previousMapping = model.clusterToTheme;
    const sampled = sampleImage(model.image, getSamplingOptions());
    model.cells = sampled.cells;
    model.clusters = sampled.clusters;
    model.saliency = sampled.saliency;
    model.gridCols = sampled.cols;
    model.gridRows = sampled.rows;

    if (previousMapping.length === model.clusters.length) {
      model.clusterToTheme = previousMapping.map(
        (index) => index % getActiveTheme(model.config).colors.length,
      );
    } else {
      model.clusterToTheme = mapClustersToTheme(
        model.clusters,
        getActiveTheme(model.config).colors,
      );
    }

    renderMapping();
    renderArtwork();
    elements.gridCount.textContent = `${model.gridCols} × ${model.gridRows}`;
    if (fit) requestAnimationFrame(fitArtboard);
  } catch (error) {
    console.error('Could not generate the pixel artwork.', error);
    notify(error instanceof Error ? error.message : 'The image could not be processed.');
  }
}
