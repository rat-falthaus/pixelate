export interface StoredBrandAsset {
  id: string;
  kind: 'logo' | 'font';
  name: string;
  type: string;
  blob: Blob;
  width?: number;
  height?: number;
}

export interface GalleryFreeze {
  id: string;
  createdAt: number;
  blob: Blob;
}

const DATABASE_NAME = 'pixelate-local-data';
const DATABASE_VERSION = 1;
const BRAND_ASSETS = 'brand-assets';
const GALLERY_FREEZES = 'gallery-freezes';

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('This browser does not support local offline storage.'));
  }

  databasePromise = new Promise((resolve, reject) => {
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
    request.onblocked = () => reject(new Error('Local storage is blocked by another open app tab.'));
  });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Local storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local storage transaction was aborted.'));
  });
}

async function requestInStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, mode);
  const complete = transactionComplete(transaction);
  const result = await requestResult(createRequest(transaction.objectStore(storeName)));
  await complete;
  return result;
}

function createId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export async function saveBrandAsset(
  asset: Omit<StoredBrandAsset, 'id'> & { id?: string },
): Promise<StoredBrandAsset> {
  const stored: StoredBrandAsset = { ...asset, id: asset.id ?? createId() };
  await requestInStore(BRAND_ASSETS, 'readwrite', (store) => store.put(stored));
  return stored;
}

export async function getBrandAsset(id: string): Promise<StoredBrandAsset | undefined> {
  return requestInStore(BRAND_ASSETS, 'readonly', (store) => store.get(id));
}

export async function deleteBrandAsset(id: string): Promise<void> {
  await requestInStore(BRAND_ASSETS, 'readwrite', (store) => store.delete(id));
}

export async function saveGalleryFreeze(blob: Blob): Promise<GalleryFreeze> {
  const freeze: GalleryFreeze = { id: createId(), createdAt: Date.now(), blob };
  await requestInStore(GALLERY_FREEZES, 'readwrite', (store) => store.put(freeze));
  return freeze;
}

export async function listGalleryFreezes(): Promise<GalleryFreeze[]> {
  const freezes = await requestInStore(GALLERY_FREEZES, 'readonly', (store) => store.getAll());
  return freezes.sort((left, right) => right.createdAt - left.createdAt);
}

export async function getGalleryFreeze(id: string): Promise<GalleryFreeze | undefined> {
  return requestInStore(GALLERY_FREEZES, 'readonly', (store) => store.get(id));
}

export async function deleteGalleryFreeze(id: string): Promise<void> {
  await requestInStore(GALLERY_FREEZES, 'readwrite', (store) => store.delete(id));
}

export async function clearGalleryFreezes(): Promise<void> {
  await requestInStore(GALLERY_FREEZES, 'readwrite', (store) => store.clear());
}
