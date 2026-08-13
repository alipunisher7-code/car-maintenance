export const STATUS = { OK: 'ok', WARNING: 'warning', OVERDUE: 'overdue' };

/**
 * part: { lastKm, lastDate, intervalKm, intervalDays }
 * currentKm: number
 */
export function getPartStatus(part, currentKm) {
  const { lastKm, lastDate, intervalKm, intervalDays } = part;
  const now = Date.now();
  const daysPassed = (now - new Date(lastDate).getTime()) / 86400000;
  const kmPassed = currentKm - lastKm;

  const kmRatio = intervalKm ? kmPassed / intervalKm : 0;
  const dayRatio = intervalDays ? daysPassed / intervalDays : 0;
  const ratio = Math.max(kmRatio, dayRatio);

  if (ratio >= 1) return { status: STATUS.OVERDUE, ratio };
  if (ratio >= 0.85) return { status: STATUS.WARNING, ratio };
  return { status: STATUS.OK, ratio };
}

export function nextServiceKm(part) {
  return part.lastKm + (part.intervalKm || 0);
}
