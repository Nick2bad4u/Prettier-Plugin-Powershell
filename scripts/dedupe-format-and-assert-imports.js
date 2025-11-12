import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testDir = path.resolve(__dirname, '..', 'tests');

function dedupeImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const importIdxs = [];
  const importNames = new Set();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['\"]\.\/utils\/format-and-assert\.js['\"];?\s*$/);
    if (m) {
      importIdxs.push(i);
      const names = m[1].split(',').map((s) => s.trim()).filter(Boolean);
      names.forEach((n) => importNames.add(n));
    }
  }

  if (importIdxs.length <= 1) return false; // no dupes

  // Create single import line
  const combined = `import { ${[...importNames].join(', ')} } from "./utils/format-and-assert.js";`;
  // Replace first import line with combined, remove others
  lines[importIdxs[0]] = combined;
  for (let j = importIdxs.length - 1; j >= 1; j--) {
    lines.splice(importIdxs[j], 1);
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log('Dedupe import in', filePath);
  return true;
}

const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.property.test.ts'));
for (const f of files) dedupeImports(path.join(testDir, f));

console.log('done');
