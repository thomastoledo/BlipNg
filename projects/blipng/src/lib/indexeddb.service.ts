export class IndexedDbService {
  private dbName: string;
  private storeName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string, storeName: string) {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  public async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onerror = (event) => {
        reject(new Error(`IndexedDB error: ${(event.target as IDBOpenDBRequest).error?.message}`));
      };
    });
  }

  public async setItem(key: string, value: any): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        await this.init();
      }
      if (!this.db) {
        reject(new Error('Database not initialized.'));
        return;
      }

      try {
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.put(value, key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (event) => {
          reject(new Error(`Error setting item: ${(event.target as IDBRequest).error?.message}`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  public async getItem(key: string): Promise<any | null> {
    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        await this.init();
      }
      if (!this.db) {
        reject(new Error('Database not initialized.'));
        return;
      }

      try {
        const transaction = this.db.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.get(key);

        request.onsuccess = (event) => {
          resolve((event.target as IDBRequest).result || null);
        };

        request.onerror = (event) => {
          reject(new Error(`Error getting item: ${(event.target as IDBRequest).error?.message}`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  public async removeItem(key: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        await this.init();
      }
      if (!this.db) {
        reject(new Error('Database not initialized.'));
        return;
      }

      try {
        const transaction = this.db.transaction(this.storeName, 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (event) => {
          reject(new Error(`Error removing item: ${(event.target as IDBRequest).error?.message}`));
        };
      } catch (error) {
        reject(error);
      }
    });
  }
}
