import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.resolve(__dirname, '..', 'tests');
const SKIP_FILES = new Set(['number-literals.test.ts']);

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

function addImports(content, helper) {
  const importRegex = /(^\s*import[\s\S]*?;\r?\n)(?!import)/m;
  const match = content.match(importRegex);
  if (!match) {
    return `import { ${helper} } from "./utils/format-and-assert.js";\n${content}`;
  }
  const idx = match.index + match[0].length;
  return content.slice(0, idx) + `\nimport { ${helper} } from "./utils/format-and-assert.js";\n` + content.slice(idx);
}

function convertFile(filePath) {
  const fileName = path.basename(filePath);
  if (SKIP_FILES.has(fileName)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let changed = false;

  // For assignments like: const result = await prettier.format(script, baseConfig);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*await\s+prettier\.format\(/);
    if (!m) continue;
    const indent = m[1];
    const varName = m[2];
    const endLine = findEndParen(lines, i);
    if (endLine === -1) continue;
    const args = extractArgs(lines, i, endLine);

    // check if assertPowerShellParses exists following — if so, skip (already converted)
    const assertRegex = new RegExp(`assertPowerShellParses\\s*\\(\\s*${varName}\\s*`, 'i');
    let hasAssert = false;
    for (let j = endLine + 1; j <= Math.min(lines.length - 1, endLine + 6); j++) {
      if (assertRegex.test(lines[j])) {
        hasAssert = true;
        break;
      }
    }
    const id = `${fileName.replace(/\\.test\\.ts$/, '')}.${varName}`;
    // Build new line
    const newLine = `${indent}const ${varName} = await formatAndAssert(${args}, { id: \"${id}\", skipParse: ${hasAssert ? 'false' : 'true'} });`;
    lines.splice(i, endLine - i + 1, newLine);
    changed = true;
  }

  if (changed) {
    let updated = lines.join('\n');
    if (updated.includes('formatAndAssert(') && !updated.includes('import { formatAndAssert')) {
      updated = addImports(updated, 'formatAndAssert');
    }
    fs.writeFileSync(filePath, updated, 'utf8');
    console.log('Converted assignments to formatAndAssert in', filePath);
  }
}

const files = fs.readdirSync(testDir).filter((f) => f.endsWith('.test.ts') || f.endsWith('.property.test.ts'));
for (const f of files) convertFile(path.join(testDir, f));
console.log('done');
