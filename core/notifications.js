import { vehicleRepo, partRepo } from '../db.js';
import { getPartStatus, STATUS } from './calculations.js';

export async function registerNotifications() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.register('/sw.js');
  if (Notification.permission === 'default') await Notification.requestPermission();
  return reg;
}

export async function checkAndNotify() {
  if (Notification.permission !== 'granted') return;
  const sw = await navigator.serviceWorker.ready;
  const vehicles = await vehicleRepo.getAll();
  for (const v of vehicles) {
    const parts = await partRepo.getByVehicle(v.id);
    for (const p of parts) {
      const { status } = getPartStatus(p, v.currentKm || 0);
      if (status === STATUS.OVERDUE)
        sw.active.postMessage({ type: 'NOTIFY', title: `${v.name} — سررسید گذشته`, body: `${p.name} نیاز به تعویض دارد`, tag: `overdue-${p.id}` });
      else if (status === STATUS.WARNING)
        sw.active.postMessage({ type: 'NOTIFY', title: `${v.name} — هشدار`, body: `${p.name} به زودی نیاز به تعویض دارد`, tag: `warn-${p.id}` });
    }
  }
}
