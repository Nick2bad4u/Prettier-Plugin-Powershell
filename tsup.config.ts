import type { Options } from "tsup";

const config: Options = {
    clean: true,
    dts: {
        resolve: true,
    },
    entry: {
        index: "src/plugin.ts",
    },
    format: ["cjs", "esm"],
    minify: false,
    outDir: "dist",
    platform: "node",
    sourcemap: true,
    target: "es2020",
    treeshake: false,
};

export default config;
