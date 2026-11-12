/** Connection cache shared by local-store operations; never imports studio UI modules. */
interface RuntimeState {
  databasePromise: Promise<IDBDatabase> | null;
}

export const runtime: RuntimeState = {
  databasePromise: null,
};
