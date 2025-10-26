import { doc } from 'prettier';

const { printDocToString } = doc.printer;
const { indent, hardline, dedentToRoot, group, align } = doc.builders;

const doc1 = group(['{', indent([hardline, 'return']), hardline, '}']);
console.log('doc1:\n' + printDocToString(doc1, {
  printWidth: 80,
  tabWidth: 4
}).formatted);

const doc2 = group([
  dedentToRoot('HERE\nline\n"@'),
  hardline,
  ['  ', align(2, group(['return', ' ', '$items']))]
]);
console.log('doc2:\n' + printDocToString(doc2, {
  printWidth: 80,
  tabWidth: 4
}).formatted);
