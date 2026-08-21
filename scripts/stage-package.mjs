import * as fileSystem from "node:fs/promises";
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
const manifest = JSON.parse(await fileSystem.readFile(packageJsonPath, "utf8"));
manifest.allowScripts = undefined;
manifest.devDependencies = undefined;
manifest.devEngines = undefined;
manifest.scripts = undefined;

await fileSystem.rm(stagingRoot, { force: true, recursive: true });
await fileSystem.mkdir(stagingRoot, { recursive: true });

for (const path of [
    "dist",
    "LICENSE.md",
    "README.md",
]) {
    const source = resolve(repositoryRoot, path);
    await fileSystem.access(source);
    await fileSystem.cp(source, resolve(stagingRoot, path), {
        recursive: true,
    });
}

await fileSystem.writeFile(
    resolve(stagingRoot, "package.json"),
    `${JSON.stringify(manifest, undefined, 4)}\n`,
    "utf8"
);

console.log(
    `Staged ${manifest.name}@${manifest.version} without development or lifecycle metadata at ${relativeStagingRoot}.`
);
