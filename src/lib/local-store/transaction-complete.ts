/** Resolve only after an IndexedDB transaction commits; reject errors and aborts. */
export function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Local storage transaction failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Local storage transaction was aborted.'));
  });
}
