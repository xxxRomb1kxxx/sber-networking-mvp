// Файл демо-базы живёт в localStorage браузера: у каждого посетителя своя копия.
const key = (file) => `sbn.fs:${file.split('/').pop()}`;

export function readFileSync(file) {
  const value = localStorage.getItem(key(file));
  if (value === null) throw Object.assign(new Error(`ENOENT: ${file}`), { code: 'ENOENT' });
  return value;
}

export function writeFileSync(file, data) {
  localStorage.setItem(key(file), String(data));
}

export const existsSync = (file) => localStorage.getItem(key(file)) !== null;
export const mkdirSync = () => {};

export default { readFileSync, writeFileSync, existsSync, mkdirSync };
