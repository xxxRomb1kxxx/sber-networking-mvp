export function join(...parts) {
  const out = [];
  for (const seg of parts.join('/').split('/')) {
    if (seg === '..') out.pop();
    else if (seg && seg !== '.') out.push(seg);
  }
  return `/${out.join('/')}`;
}

export const dirname = (p) => p.replace(/\/[^/]*\/?$/, '') || '/';

export default { join, dirname };
