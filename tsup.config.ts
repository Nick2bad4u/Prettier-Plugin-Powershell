import { defineConfig } from "tsup";

export default defineConfig({
    clean: true,
    dts: true,
    entry: {
        index: "src/plugin.ts",
    },
    external: ["prettier"],
    format: ["esm", "cjs"],
    outDir: "dist",
    shims: false,
    sourcemap: true,
    splitting: false,
    target: "es2020",
});
