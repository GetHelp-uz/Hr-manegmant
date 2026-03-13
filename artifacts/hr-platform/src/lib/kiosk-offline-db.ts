const DB_NAME = "kiosk_offline_v1";
const STORE = "pending_scans";

type PendingScan = {
  id?: number;
  qrData: string;
  companyId: number;
  photo: string | null;
  timestamp: number;
  synced: boolean;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueScan(scan: Omit<PendingScan, "id" | "synced">) {
  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).add({ ...scan, synced: false });
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingScans(): Promise<PendingScan[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as PendingScan[]).filter(s => !s.synced));
    req.onerror = () => reject(req.error);
  });
}

export async function markSynced(id: number) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const record = req.result;
      if (record) {
        record.synced = true;
        store.put(record);
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCount(): Promise<number> {
  const scans = await getPendingScans();
  return scans.length;
}
