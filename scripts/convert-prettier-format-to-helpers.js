import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testDir = path.resolve(__dirname, '..', 'tests');
const SKIP_FILES = new Set(['number-literals.test.ts']); // explicit skip

function findEndParen(lines, startLine) {
  let depth = 0;
  let foundStart = false;
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (!foundStart && ch === '(') foundStart = true;
      if (foundStart) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
      }
    }
    if (foundStart && depth === 0 && line.includes(');')) return i;
  }
  return -1;
}

function extractArgs(lines, startLine, endLine) {
  const header = lines[startLine];
  const idx = header.indexOf('prettier.format(');
  const firstParenIdx = header.indexOf('(', idx) + 1;
  const lastLine = lines[endLine];
  const lastParenIdx = lastLine.lastIndexOf(')');
  const parts = [];
  if (startLine === endLine) {
    parts.push(header.slice(firstParenIdx, lastParenIdx));
  } else {
    parts.push(header.slice(firstParenIdx));
    for (let k = startLine + 1; k < endLine; k++) {
      parts.push(lines[k]);
    }
    parts.push(lastLine.slice(0, lastParenIdx));
  }
  return parts.join('\n');
}

function findAssertForVar(lines, varName, startLine, range) {
  const maxLine = Math.min(lines.length - 1, startLine + range);
  for (let i = startLine; i <= maxLine; i++) {
    const m = lines[i].match(new RegExp(`assertPowerShellParses\\s*\\(\\s*${varName}\\s*,\\s*['\\\"]([^'\\\"]+)['\\\"]\\s*\\);`));
    if (m) return { line: i, id: m[1] };
  }
  return null;
}

function importAdded(content, importName) {
  return content.includes(importName);
}

function addImportForHelpers(content, helpers) {
  // Insert after existing imports block
  const importRegex = /(^\s*import[\s\S]*?;\r?\n)(?!import)/m;
  const match = content.match(importRegex);
  if (!match) {
    return `import { ${helpers.join(', ')} } from "./utils/format-and-assert.js";\n${content}`;
  }
  const idx = match.index + match[0].length;
  return content.slice(0, idx) + `\nimport { ${helpers.join(', ')} } from "./utils/format-and-assert.js";\n` + content.slice(idx);
}

function convertFile(filePath) {
  const fileName = path.basename(filePath);
  if (SKIP_FILES.has(fileName)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('NO_PARSE_ASSERT')) return; // skip
  const lines = content.split(/\r?\n/);
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*await\s+prettier\.format\(/);
    if (!m) continue;
    const indent = m[1];
    const varName = m[2];
    const endLine = findEndParen(lines, i);
    if (endLine === -1) continue;
    const args = extractArgs(lines, i, endLine);
    // find assert for varName in next 6 lines
    const assert = findAssertForVar(lines, varName, endLine + 1, 8);
    if (assert) {
      // Replace from line i to assert.line with formatAndAssert
      const newLine = `${indent}const ${varName} = await formatAndAssert(${args}, \"${assert.id}\");`;
      lines.splice(i, assert.line - i + 1, newLine);
      changed = true;
      continue;
    }
    // Find if varName used in parsePowerShell(varName, ...)
    const parseUsage = (() => {
      const maxCheckLine = Math.min(lines.length - 1, endLine + 6);
      for (let j = endLine + 1; j <= maxCheckLine; j++) {
        if (lines[j].includes(`parsePowerShell(${varName}`) || lines[j].includes(`${varName},`) ) return j;
      }
      return -1;
    })();
    if (parseUsage !== -1) {
      // replace with formatAndAssert with generated id filename.var
      const id = `${fileName.replace(/\.test\.ts$/, '')}.${varName}`;
      const newLine = `${indent}const ${varName} = await formatAndAssert(${args}, \"${id}\");`;
      lines.splice(i, endLine - i + 1, newLine);
      changed = true;
      continue;
    }
    // Check for formatted2 pattern
    let found2 = false;
    for (let j = endLine + 1; j <= Math.min(lines.length - 1, endLine + 8); j++) {
      const m2 = lines[j].match(/^(\s*)(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*await\s+prettier\.format\(\s*([A-Za-z0-9_]+)\s*,/);
      if (m2 && m2[3] === varName) {
        const var2 = m2[2];
        // find end of second format
        const end2 = findEndParen(lines, j);
        if (end2 === -1) break;
        // Check if there is an idempotence check/expect next
        for (let k = end2 + 1; k <= Math.min(lines.length - 1, end2 + 8); k++) {
          const s = lines[k];
          if (s.includes(`expect(${var2}).toBe(${varName})`) || s.includes(`${varName} !== ${var2}`) || s.includes(`${var2} !== ${varName}`)) {
            // replace from i to k with formatAndAssertRoundTrip
            const id = `${fileName.replace(/\.test\.ts$/, '')}.${varName}`;
            const newLine = `${indent}const ${varName} = await formatAndAssertRoundTrip(${args}, \"${id}\");`;
            lines.splice(i, k - i + 1, newLine);
            changed = true;
            found2 = true;
            break;
          }
        }
        if (found2) break;
      }
    }
    if (found2) continue;
  }

  if (changed) {
    let updated = lines.join('\n');
    // Add import for helpers if needed
    if (updated.includes('formatAndAssertRoundTrip(') || updated.includes('formatAndAssert(')) {
      const helpers = [];
      if (updated.includes('formatAndAssert(')) helpers.push('formatAndAssert');
      if (updated.includes('formatAndAssertRoundTrip(')) helpers.push('formatAndAssertRoundTrip');
      if (!importAdded(updated, 'formatAndAssert')) {
        updated = addImportForHelpers(updated, helpers);
      }
    }

    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('Converted:', filePath);
  }
}

const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.property.test.ts'));
for (const f of files) convertFile(path.join(testDir, f));
console.log('done');
