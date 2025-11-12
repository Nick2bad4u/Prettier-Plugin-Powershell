import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testDir = path.resolve(__dirname, '..', 'tests');

function convertFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let changed = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for 'const formatted1 = await prettier.format(script, {'
    const m = line.match(/^\s*(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*await\s+prettier\.format\(/);
    if (!m) continue;
    const var1 = m[1];

    // Track formatted1 end line
    let parenDepth = 0;
    let foundStart = false;
    let end1 = -1;
    for (let j = i; j < lines.length; j++) {
      const str = lines[j];
      for (let k = 0; k < str.length; k++) {
        const ch = str[k];
        if (!foundStart && ch === '(') {
          foundStart = true;
        }
        if (foundStart) {
          if (ch === '(') parenDepth++;
          else if (ch === ')') parenDepth--;
        }
      }
      if (foundStart && parenDepth === 0 && str.includes(');')) {
        end1 = j;
        break;
      }
    }
    if (end1 === -1) continue; // couldnt find end

    // Find formatted2 following pattern: const formatted2 = await prettier.format(formatted1, { ... });
    let found2 = false;
    let start2 = -1;
    let end2 = -1;
    let var2 = null;
    for (let j = end1 + 1; j < Math.min(lines.length, end1 + 8); j++) {
      const str = lines[j];
      const m2 = str.match(/^\s*(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*await\s+prettier\.format\(\s*([A-Za-z0-9_]+)\s*,/);
      if (m2 && m2[2] === var1) {
        var2 = m2[1];
        start2 = j;
        // find end2
        let pdepth = 0;
        let fstart = false;
        for (let k = j; k < lines.length; k++) {
          const s2 = lines[k];
          for (let c = 0; c < s2.length; c++) {
            const ch = s2[c];
            if (!fstart && ch === '(') fstart = true;
            if (fstart) {
              if (ch === '(') pdepth++;
              else if (ch === ')') pdepth--;
            }
          }
          if (fstart && pdepth === 0 && s2.includes(');')) {
            end2 = k;
            break;
          }
        }
        if (end2 > -1) {
          found2 = true;
          break;
        }
      }
    }

    if (!found2) continue; // pattern not matched fully

    // Find assertParse lines for var1 and var2 and id
    let id = null;
    for (let j = i; j <= end2 + 6 && j < lines.length; j++) {
      const assertMatch = lines[j].match(/assertPowerShellParses\(\s*([A-Za-z0-9_]+)\s*,\s*['\"]([^'\"]+)['\"]\s*\);/);
      if (assertMatch) {
        // prefer var2 if matched else var1
        if (assertMatch[1] === var2) {
          id = assertMatch[2];
          break;
        } else if (assertMatch[1] === var1) {
          id = assertMatch[2];
        }
      }
    }
    if (!id) {
      // fallback to filename + var1
      id = path.basename(filePath).replace(/\.test\.ts$/, '') + '.' + var1;
    }

    // Find the equality check 'if (formatted1 !== formatted2) { throw new Error... }' or equality 'expect(formatted2).toBe(formatted1)'
    let idempStart = -1;
    let idempEnd = -1;
    for (let j = end2 + 1; j <= Math.min(end2 + 8, lines.length - 1); j++) {
      const str = lines[j].trim();
      if (str.includes('if (') && (str.includes('!==') || str.includes('!=='))) {
        // naive: find block end '}'
        idempStart = j;
        for (let k = j; k <= j + 50 && k < lines.length; k++) {
          if (lines[k].includes('}')) { idempEnd = k; break; }
        }
        break;
      }
      if (str.includes('expect(') && str.includes(var2) && str.includes('toBe(') && str.includes(var1)) {
        idempStart = j;
        idempEnd = j;
        break;
      }
    }

    // Build replacement: const var1 = await formatAndAssertRoundTrip(script, options, {id: 'id'})
    // Extract the snippet for args from line i..end1 to reconstruct
    const argsLines = lines.slice(i, end2 + 1); // include both lines and assert
    const callStartIdx = argsLines[0].indexOf('prettier.format(');
    const parenIdx = argsLines[0].indexOf('(', callStartIdx) + 1;
    const argsBuffer = [];
    for (let k = 0; k < argsLines.length; k++) {
      const ln = argsLines[k];
      if (k === 0) {
        argsBuffer.push(ln.slice(parenIdx));
      } else if (k === argsLines.length - 1) {
        // last line includes the end )
        const idx = ln.lastIndexOf(')');
        argsBuffer.push(ln.slice(0, idx));
      } else {
        argsBuffer.push(ln);
      }
    }
    const argsText = argsBuffer.join('\n').trim();

    const indent = line.match(/^\s*/)[0] || '';
    const newLine = `${indent}const ${var1} = await formatAndAssertRoundTrip(${argsText}, \"${id}\");`;

    // Remove lines from i to idempEnd or to end2
    const spliceEnd = idempEnd > -1 ? idempEnd : end2;
    lines.splice(i, spliceEnd - i + 1, newLine);
    changed = true;
  }

  if (changed) {
    let updated = lines.join('\n');
    // ensure import for formatAndAssertRoundTrip
    if (!updated.includes('formatAndAssertRoundTrip(') && updated.includes('formatAndAssert(')) {
      // nothing
    }
    if (!updated.includes('import { formatAndAssert }') && !updated.includes('formatAndAssertRoundTrip')) {
      const importRegex = /(^\s*import[\s\S]*?;\r?\n)(?!import)/m;
      const importMatch = updated.match(importRegex);
      if (importMatch) {
        const idx = importMatch.index + importMatch[0].length;
        updated = updated.slice(0, idx) + '\nimport { formatAndAssert, formatAndAssertRoundTrip } from "./utils/format-and-assert.js";\n' + updated.slice(idx);
      } else {
        updated = 'import { formatAndAssert, formatAndAssertRoundTrip } from "./utils/format-and-assert.js";\n' + updated;
      }
    }
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('Patched roundtrip in', filePath);
  }
}

const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.property.test.ts'));
for (const f of files) convertFile(path.join(testDir, f));
console.log('done');
