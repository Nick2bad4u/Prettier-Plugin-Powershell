import { cruise } from "dependency-cruiser";

const mode = process.argv[2] ?? "";
const supportedModes = new Set([
    "circular",
    "leaves",
    "orphans",
]);

if (!supportedModes.has(mode)) {
    process.stderr.write(
        "Usage: node scripts/analyze-dependencies.mjs <circular|leaves|orphans>\n"
    );
    process.exitCode = 2;
} else {
    const result = await cruise(["src"], {
        includeOnly: "^src(?:/|$)",
        outputType: "json",
        ruleSet: {
            forbidden: [
                {
                    name: "no-circular",
                    comment:
                        "Source modules must not contain circular dependencies.",
                    severity: "error",
                    from: { path: "^src(?:/|$)" },
                    to: { circular: true },
                },
            ],
        },
        tsConfig: { fileName: "tsconfig.json" },
        tsPreCompilationDeps: true,
        validate: true,
    });

    /** @type {import("dependency-cruiser").ICruiseResult} */
    const report =
        typeof result.output === "string"
            ? JSON.parse(result.output)
            : result.output;

    if (!report || !Array.isArray(report.modules) || !report.summary) {
        throw new TypeError(
            "dependency-cruiser returned an unexpected report shape."
        );
    }

    const sourceModules = report.modules.filter(
        (module) =>
            typeof module.source === "string" &&
            /^src(?:\/|$)/u.test(module.source)
    );
    /** @param {import("dependency-cruiser").IModule} module */
    const internalDependencies = (module) =>
        Array.isArray(module.dependencies)
            ? module.dependencies.filter(
                  (dependency) =>
                      typeof dependency.resolved === "string" &&
                      /^src(?:\/|$)/u.test(dependency.resolved)
              )
            : [];
    const referencedSources = new Set(
        sourceModules.flatMap((module) =>
            internalDependencies(module).map(
                (dependency) => dependency.resolved
            )
        )
    );

    if (mode === "circular") {
        const violations = Array.isArray(report.summary.violations)
            ? report.summary.violations.filter(
                  (violation) => violation.rule?.name === "no-circular"
              )
            : [];

        if (violations.length === 0) {
            console.log("No circular dependency found.");
        } else {
            console.error("Circular dependencies found:");
            for (const violation of violations) {
                const cycle = Array.isArray(violation.cycle)
                    ? [
                          violation.from,
                          ...violation.cycle.map(
                              (dependency) => dependency.name
                          ),
                      ].join(" -> ")
                    : `${violation.from} -> ${violation.to}`;
                console.error(cycle);
            }
            process.exitCode = 1;
        }
    } else {
        const selectedModules =
            mode === "leaves"
                ? sourceModules.filter(
                      (module) => internalDependencies(module).length === 0
                  )
                : sourceModules.filter(
                      (module) => !referencedSources.has(module.source)
                  );

        for (const module of selectedModules.toSorted((left, right) =>
            left.source.localeCompare(right.source, "en")
        )) {
            console.log(module.source);
        }
    }
}
