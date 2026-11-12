import { openDatabase } from "./open-database";
import { requestResult } from "./request-result";
import { transactionComplete } from "./transaction-complete";

/**
 * Execute one store request and wait for its transaction to commit.
 * @param createRequest Creates the request synchronously while the transaction is active.
 * @returns The request result only after the encompassing transaction completes.
 */
export async function requestInStore<T>(
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
