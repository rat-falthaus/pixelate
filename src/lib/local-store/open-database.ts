import { BRAND_ASSETS, DATABASE_NAME, DATABASE_VERSION, GALLERY_FREEZES } from './state';
import { runtime } from './state/runtime';

/** Open and initialize the local asset database, sharing one connection promise per page. */
export function openDatabase(): Promise<IDBDatabase> {
  if (runtime.databasePromise) return runtime.databasePromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser does not support local offline storage.'));
  }

  runtime.databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(BRAND_ASSETS)) {
        database.createObjectStore(BRAND_ASSETS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(GALLERY_FREEZES)) {
        database.createObjectStore(GALLERY_FREEZES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open local storage.'));
    request.onblocked = () =>
      reject(new Error('Local storage is blocked by another open app tab.'));
  });
  return runtime.databasePromise;
}
