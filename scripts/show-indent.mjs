import { readFile } from "node:fs/promises";

const [file] = process.argv.slice(2);
if (!file) {
    console.error("Usage: node scripts/show-indent.mjs <file>");
    process.exit(1);
}

const text = await readFile(file, "utf8");
const lines = text.split(/\r?\n/);
for (const [index, line] of lines.entries()) {
    const indent = line.length - line.trimStart().length;
    if (indent > 0) {
        console.log(`${index + 1}: ${indent}`);
    }
}
