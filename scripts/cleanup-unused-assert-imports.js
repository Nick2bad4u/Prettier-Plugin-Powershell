import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testDir = path.resolve(__dirname, '..', 'tests');

function cleanupFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('import { assertPowerShellParses')) return;
  // Count usage of assertPowerShellParses(
  const usageCount = (content.match(/assertPowerShellParses\s*\(/g) || []).length;
  // If usageCount == 0 then it's unused import — but we might still want to remove
  if (usageCount === 0) {
    const updated = content.replace(/\n?\s*import\s*\{\s*assertPowerShellParses\s*\}[^;]*?;\s*\n/, '\n');
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('Removed unused assert import from', filePath);
  }
}

const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.property.test.ts'));
for (const f of files) cleanupFile(path.join(testDir, f));

console.log('done');
