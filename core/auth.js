const KEY = 'car_pin_hash';
const SALT_KEY = 'car_pin_salt';

function bufToHex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(pin + salt);
  return bufToHex(await crypto.subtle.digest('SHA-256', data));
}

export function hasPin() { return !!localStorage.getItem(KEY); }

export async function setPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(8)).join('');
  localStorage.setItem(KEY, await hashPin(pin, salt));
  localStorage.setItem(SALT_KEY, salt);
}

export async function verifyPin(pin) {
  const salt = localStorage.getItem(SALT_KEY) || '';
  return (await hashPin(pin, salt)) === localStorage.getItem(KEY);
}

export function clearPin() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(SALT_KEY);
}
