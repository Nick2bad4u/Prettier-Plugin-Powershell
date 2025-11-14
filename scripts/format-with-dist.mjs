import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import prettier from "prettier";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
    console.error("Usage: node scripts/format-with-dist.mjs <input> <output>");
    process.exit(1);
}

const absoluteInput = path.resolve(inputPath);
const absoluteOutput = path.resolve(outputPath);

const require = createRequire(import.meta.url);
const plugin = require("../dist/index.cjs");

const source = await readFile(absoluteInput, "utf8");
const formatted = await prettier.format(source, {
    parser: "powershell",
    plugins: [plugin],
    filepath: absoluteInput,
});

await writeFile(absoluteOutput, formatted, "utf8");
