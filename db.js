// IndexedDB via Dexie
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3/dist/dexie.mjs';

export const db = new Dexie('CarMaintenance');
db.version(1).stores({
  vehicles: '++id, name',
  parts: '++id, vehicleId, name'
});

// Vehicle CRUD
export const vehicleRepo = {
  getAll: () => db.vehicles.toArray(),
  add: (v) => db.vehicles.add(v),
  update: (id, changes) => db.vehicles.update(id, changes),
  delete: (id) => db.transaction('rw', db.vehicles, db.parts, async () => {
    await db.parts.where('vehicleId').equals(id).delete();
    await db.vehicles.delete(id);
  })
};

// Part CRUD
export const partRepo = {
  getByVehicle: (vid) => db.parts.where('vehicleId').equals(vid).toArray(),
  add: (p) => db.parts.add(p),
  update: (id, changes) => db.parts.update(id, changes),
  delete: (id) => db.parts.delete(id)
};