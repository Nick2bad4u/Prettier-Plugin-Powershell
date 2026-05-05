import nick2bad4u from "eslint-config-nick2bad4u";

/** @type {import("eslint").Linter.Config[]} */
const config = [
    ...nick2bad4u.configs.all,

    // Exclude Jekyll template fragments from ESLint.
    // These HTML includes/layouts use Liquid syntax and HTML comments that
    // are incompatible with JS/TS linting rules (e.g. @stylistic/spaced-comment
    // crashes on <!-- --> HTML comment syntax).
    {
        ignores: ["_includes/**", "_layouts/**"],
    },
];

export default config;
