import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/plugin.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  target: "es2020",
  outDir: "dist",
  shims: false,
  external: ["prettier"]
});

