import { initialize } from './studio/ui/initialize';
import { notify } from './studio/ui/notify';

void initialize().catch((error: unknown) => {
  console.error('Studio initialization failed.', error);
  notify(error instanceof Error ? error.message : 'The studio could not be started.');
});
