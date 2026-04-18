/**
 * Local placeholder ESLint plugin config imported by `eslint.config.mjs`.
 *
 * @remarks
 * The upstream strict config expects this module to exist and expose
 * `configs.experimental.rules`. This repository does not currently ship a
 * custom ESLint plugin, so we provide an empty config surface to keep the
 * strict config loadable without changing its structure.
 */
const plugin = {
    configs: {
        experimental: {
            rules: {},
        },
    },
    rules: {},
};

export default plugin;
