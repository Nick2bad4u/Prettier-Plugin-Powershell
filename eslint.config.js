/**
 * Pass-through ESLint config module.
 *
 * @remarks
 * The repository adopts the strict flat config defined in `eslint.config.mjs`.
 * This file exists only to keep toolchains that probe `eslint.config.js`
 * compatible while still loading the strict configuration.
 */
export { default } from "./eslint.config.mjs";
