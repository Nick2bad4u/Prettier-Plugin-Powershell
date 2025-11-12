import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  'tests/advanced-coverage.test.ts','tests/advanced-features.test.ts','tests/advanced-formatting.test.ts','tests/advanced-printer.test.ts','tests/call-operator.test.ts','tests/comment-positioning.test.ts','tests/coverage.test.ts','tests/deep-nesting.test.ts','tests/delimited-sequences.test.ts','tests/error-handling.test.ts','tests/formatting-edge-cases.test.ts','tests/long-line-wrapping.test.ts','tests/number-literals.test.ts','tests/operators.test.ts','tests/parser-edge-cases.test.ts','tests/plugin.test.ts'
];

for(const f of files){
  const filePath = path.resolve(__dirname, '..', f);
  if(!fs.existsSync(filePath)){
    console.log('Missing file: ', f);
    continue;
  }
  let content = fs.readFileSync(filePath,'utf8');
  if(!content.includes('assertPowerShellParses')){
    const importRegex = /(^\s*import[\s\S]*?;\r?\n)(?!import)/m;
    const importBlockMatch = content.match(importRegex);
    if(importBlockMatch){
      const idx = importBlockMatch.index + importBlockMatch[0].length;
      const before = content.slice(0, idx);
      const after = content.slice(idx);
      content = before + '\nimport { assertPowerShellParses } from "./utils/powershell.js";\n' + after;
      console.log('Inserted import in', f);
    } else {
      content = 'import { assertPowerShellParses } from "./utils/powershell.js";\n' + content;
      console.log('Inserted import at top in', f);
    }
  }

  const regex = /(^\s*(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*await\s+prettier\.format\([^;]+;\s*\n)/mg;
  content = content.replace(regex, (m, assignment, varName) => {
    const id = path.basename(filePath).replace(/\.test\.ts$/, '');
    return assignment + '    assertPowerShellParses(' + varName + ', "' + id + '.' + varName + '");\n';
  });

  // in case of variable named differently or not const/let
  const fallbackRegex = /(^\s*([A-Za-z0-9_]+)\s*=\s*await\s+prettier\.format\([\s\S]*?\);)/mg;
  content = content.replace(fallbackRegex, (m, assignment, varName) => {
    if(assignment.includes('assertPowerShellParses')) return assignment;
    const id = path.basename(filePath).replace(/\.test\.ts$/, '');
    return assignment + '\n    assertPowerShellParses(' + varName + ', "' + id + '.' + varName + '");';
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Updated file:', f);
}

console.log('Done');
