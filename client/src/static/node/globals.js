// Глобальные объекты Node, которых нет в браузере: Buffer и process.env.
// Модуль импортируется первым, до кода сервера.
const enc = new TextEncoder();
const dec = new TextDecoder();

function toBase64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export class Buffer extends Uint8Array {
  static from(value, encoding = 'utf8') {
    let bytes;
    if (typeof value !== 'string') bytes = value;
    else if (encoding === 'base64' || encoding === 'base64url') bytes = fromBase64(value);
    else if (encoding === 'hex') bytes = Uint8Array.from(value.match(/../g) || [], (h) => parseInt(h, 16));
    else bytes = enc.encode(value);
    const buf = new Buffer(bytes.length);
    buf.set(bytes);
    return buf;
  }

  toString(encoding = 'utf8') {
    if (encoding === 'hex') return Array.from(this, (b) => b.toString(16).padStart(2, '0')).join('');
    if (encoding === 'base64') return toBase64(this);
    if (encoding === 'base64url') return toBase64(this).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return dec.decode(this);
  }
}

globalThis.Buffer ??= Buffer;
globalThis.process ??= { env: {} };
