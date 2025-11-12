import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testDir = path.resolve(__dirname, '..', 'tests');

function replaceInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let changed = false;

  const NO_PARSE_MARKER = 'NO_PARSE_ASSERT';
  const skipFile = content.includes(NO_PARSE_MARKER);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // match: const|let|var <var> = await prettier.format(
    const m = line.match(/^\s*(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*await\s+prettier\.format\(/);
    if (!m) continue;
    const varName = m[1];

    // Find end of prettier.format(...) call by tracking parentheses
    let parenDepth = 0;
    let foundStart = false;
    let endLine = -1;
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
      // If foundStart and parenDepth reached 0 and the line contains ');', break
      if (foundStart && parenDepth === 0 && str.includes(');')) {
        endLine = j;
        break;
      }
    }
    if (endLine === -1) continue; // couldn't find end

    // Now find assertPowerShellParses(varName, "id"); within next few lines
    let assertLine = -1;
    let id = null;
    for (let j = endLine + 1; j <= Math.min(endLine + 6, lines.length - 1); j++) {
      const assertMatch = lines[j].match(/assertPowerShellParses\(\s*([A-Za-z0-9_]+)\s*,\s*['\"]([^'\"]+)['\"]\s*\);/);
      if (assertMatch) {
        if (assertMatch[1] === varName) {
          assertLine = j;
          id = assertMatch[2];
          break;
        }
      }
    }
    if (assertLine === -1) continue; // not an eligible pattern

    // Build the args string within prettier.format(...) call
    const argsLines = lines.slice(i, endLine + 1);
    // Extract the substring inside prettier.format(...)
    const bracketIndex = argsLines[0].indexOf('prettier.format(');
    const startIdx = argsLines[0].indexOf('(', bracketIndex) + 1;
    const argsTextParts = [];
    if (argsLines.length === 1) {
      argsTextParts.push(argsLines[0].slice(startIdx, argsLines[0].lastIndexOf(')')));
    } else {
      argsTextParts.push(argsLines[0].slice(startIdx));
      for (let k = 1; k < argsLines.length; k++) {
        const ln = argsLines[k];
        if (k === argsLines.length - 1) {
          // last
          const lastIdx = ln.lastIndexOf(')');
          argsTextParts.push(ln.slice(0, lastIdx));
        } else {
          argsTextParts.push(ln);
        }
      }
    }
    const argsInner = argsTextParts.join('\n').trim();

    // Construct replacement line: const <varName> = await formatAndAssert(<argsInner>, "id");
    const indent = line.match(/^\s*/)[0] || '';
    const newLine = `${indent}const ${varName} = await formatAndAssert(${argsInner}, \"${id}\");`;

    // Replace line i..assertLine with the single newLine
    lines.splice(i, assertLine - i + 1, newLine);
    changed = true;
  }

  let updated = lines.join('\n');
  if (changed && !skipFile) {
    // Add import for formatAndAssert if not present
    if (!updated.includes("formatAndAssert")) {
      const importRegex = /(^\s*import[\s\S]*?;\r?\n)(?!import)/m;
      const importMatch = updated.match(importRegex);
      if (importMatch) {
        const idx = importMatch.index + importMatch[0].length;
        updated = updated.slice(0, idx) + '\nimport { formatAndAssert } from "./utils/format-and-assert.js";\n' + updated.slice(idx);
      } else {
        updated = 'import { formatAndAssert } from "./utils/format-and-assert.js";\n' + updated;
      }
    }
  }

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('Patched', filePath);
  }
}

const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.property.test.ts'));
for (const f of files) {
  replaceInFile(path.join(testDir, f));
}
console.log('done');
