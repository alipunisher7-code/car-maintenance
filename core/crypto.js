const ENC = 'AES-GCM', HASH = 'SHA-256';

async function deriveKey(pin, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: HASH },
    base, { name: ENC, length: 256 }, false, ['encrypt', 'decrypt']
  );
}

export async function encrypt(data, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ct = await crypto.subtle.encrypt({ name: ENC, iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  const buf = new Uint8Array(salt.length + iv.length + ct.byteLength);
  buf.set(salt); buf.set(iv, 16); buf.set(new Uint8Array(ct), 28);
  return btoa(String.fromCharCode(...buf));
}

export async function decrypt(b64, pin) {
  const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const salt = buf.slice(0, 16), iv = buf.slice(16, 28), ct = buf.slice(28);
  const key = await deriveKey(pin, salt);
  const plain = await crypto.subtle.decrypt({ name: ENC, iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(plain));
}
