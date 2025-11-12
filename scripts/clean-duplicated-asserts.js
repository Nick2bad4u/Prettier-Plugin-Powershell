import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testDir = path.resolve(__dirname, '..', 'tests');

function cleanupFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*await\s+formatAndAssert\(/);
    if (!m) continue;
    const varName = m[1];

    // Look forward for assertPowerShellParses(varName, '...'); within next 6 lines
    for (let j = i + 1; j <= Math.min(i + 6, lines.length - 1); j++) {
      const linej = lines[j];
      const assertMatch = linej.match(/\bassertPowerShellParses\(\s*([A-Za-z0-9_]+)\s*,\s*['\"][^'\"]+['\"]\s*\);/);
      if (assertMatch && assertMatch[1] === varName) {
        // Remove this line
        lines.splice(j, 1);
        changed = true;
        break;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Cleaned duplicates in', filePath);
  }
}

const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.property.test.ts'));
for (const f of files) {
  cleanupFile(path.join(testDir, f));
}
console.log('done');
