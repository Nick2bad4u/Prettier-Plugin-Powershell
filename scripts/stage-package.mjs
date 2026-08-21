import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stagingRoot = resolve(repositoryRoot, "temp", "npm-package");
const relativeStagingRoot = relative(repositoryRoot, stagingRoot);

if (
    relativeStagingRoot === "" ||
    relativeStagingRoot === "temp" ||
    relativeStagingRoot.startsWith(`..${sep}`) ||
    relativeStagingRoot === ".."
) {
    throw new Error(`Refusing to replace unsafe staging path: ${stagingRoot}`);
}

const packageJsonPath = resolve(repositoryRoot, "package.json");
const manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));

for (const field of [
    "allowScripts",
    "devDependencies",
    "devEngines",
    "scripts",
]) {
    delete manifest[field];
}

await rm(stagingRoot, { force: true, recursive: true });
await mkdir(stagingRoot, { recursive: true });

for (const path of [
    "dist",
    "LICENSE.md",
    "README.md",
]) {
    const source = resolve(repositoryRoot, path);
    await access(source);
    await cp(source, resolve(stagingRoot, path), { recursive: true });
}

await writeFile(
    resolve(stagingRoot, "package.json"),
    `${JSON.stringify(manifest, undefined, 4)}\n`,
    "utf8"
);

console.log(
    `Staged ${manifest.name}@${manifest.version} without development or lifecycle metadata at ${relativeStagingRoot}.`
);
