import { db } from './db.js';
import { encrypt, decrypt } from './crypto.js';

export async function exportBackup(pin) {
  const vehicles = await db.vehicles.toArray();
  const parts = await db.parts.toArray();
  const blob = new Blob([await encrypt({ vehicles, parts, version: 1 }, pin)], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `car-backup-${Date.now()}.enc`;
  a.click();
}

export async function importBackup(file, pin) {
  const text = await file.text();
  const { vehicles, parts } = await decrypt(text, pin);
  await db.transaction('rw', db.vehicles, db.parts, async () => {
    await db.vehicles.clear();
    await db.parts.clear();
    await db.vehicles.bulkAdd(vehicles);
    await db.parts.bulkAdd(parts);
  });
}
