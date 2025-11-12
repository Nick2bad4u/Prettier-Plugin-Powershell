import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testDir = path.resolve(__dirname, '..', 'tests');

function ensureImport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('formatAndAssert(')) return;
  if (content.includes('import { formatAndAssert')) return;
  const importRegex = /(^\s*import[\s\S]*?;\r?\n)(?!import)/m;
  const importMatch = content.match(importRegex);
  let updated = content;
  if (importMatch) {
    const idx = importMatch.index + importMatch[0].length;
    updated = content.slice(0, idx) + '\nimport { formatAndAssert } from "./utils/format-and-assert.js";\n' + content.slice(idx);
  } else {
    updated = 'import { formatAndAssert } from "./utils/format-and-assert.js";\n' + content;
  }
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Added formatAndAssert import to', filePath);
}

const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.property.test.ts'));
for (const f of files) ensureImport(path.join(testDir, f));
console.log('done');
