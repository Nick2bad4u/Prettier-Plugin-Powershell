import type { Options } from "tsup";

const config: Options = {
    clean: true,
    dts: {
        entry: {
            index: "src/plugin.ts",
        },
        resolve: true,
    },
    entry: {
        index: "src/plugin.ts",
    },
    format: ["cjs", "esm"],
    minify: false,
    outDir: "dist",
    platform: "node",
    shims: true,
    sourcemap: true,
    target: "esnext",
    treeshake: true,
};

export default config;
