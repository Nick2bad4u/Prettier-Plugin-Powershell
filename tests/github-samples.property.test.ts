import * as fc from "fast-check";
import { createHash } from "node:crypto";
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { env } from "node:process";
import { beforeAll, describe, it } from "vitest";

import { parsePowerShell } from "../src/parser.js";
import plugin from "../src/plugin.js";
import { formatAndAssertRoundTrip } from "./utils/format-and-assert.js";
import { withProgress } from "./utils/progress.js";

interface GitHubCodeItem {
    name: string;
    path: string;
    repository: {
        full_name: string;
    };
    sha: string;
    url: string;
}

interface GitHubSearchResponse {
    items: GitHubCodeItem[];
}

interface SampledScript {
    content: string;
    identifier: string;
}

const PROPERTY_RUNS = Number.parseInt(
    env.POWERSHELL_PROPERTY_RUNS ?? "25",
    10
);
const ENABLE_GITHUB_SAMPLES =
    env.POWERSHELL_ENABLE_GITHUB_SAMPLES === "1";
const CACHE_GITHUB_SAMPLES =
    env.POWERSHELL_CACHE_GITHUB_SAMPLES === "1";
const GITHUB_QUERY =
    env.POWERSHELL_GITHUB_QUERY ??
    "extension:ps1 language:PowerShell size:1000..50000";
const GITHUB_SAMPLE_COUNT = Number.parseInt(
    env.POWERSHELL_GITHUB_SAMPLE_COUNT ?? "8",
    10
);
const MAX_CANDIDATES = Number.parseInt(
    env.POWERSHELL_GITHUB_MAX_CANDIDATES ?? "50",
    10
);
const MAX_LENGTH = Number.parseInt(
    env.POWERSHELL_GITHUB_MAX_LENGTH ?? "200000",
    10
);
const MIN_LENGTH = Number.parseInt(
    env.POWERSHELL_GITHUB_MIN_LENGTH ?? "500",
    10
);

const fallbackSamplePaths = [
    "./fixtures/github-fallback-simple.ps1",
    "./fixtures/sample-unformatted.ps1",
    "./fixtures/sample-formatted.ps1",
];

describe("real-world GitHub PowerShell samples", () => {
    const samples: SampledScript[] = [];
    const baseDir = import.meta.dirname;
    const cacheDir = join(baseDir, "fixtures", "github-cache");

    const githubHeaders: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "prettier-plugin-powershell-tests",
    };
    const githubToken = env.GITHUB_TOKEN;
    if (githubToken) {
        githubHeaders.Authorization = `token ${githubToken}`;
    }

    const getCacheFileName = (identifier: string): string => {
        const hash = createHash("sha256")
            .update(identifier)
            .digest("hex")
            .slice(0, 16);
        const safeName = identifier
            .replaceAll(/[^\d\-.a-z]/gi, "_")
            .slice(0, 50);
        return `${safeName}-${hash}.ps1`;
    };

    const loadFromCache = (identifier: string): null | string => {
        if (!CACHE_GITHUB_SAMPLES) {
            return null;
        }
        try {
            const cacheFile = join(cacheDir, getCacheFileName(identifier));
            if (existsSync(cacheFile)) {
                return readFileSync(cacheFile, "utf8");
            }
        } catch {
            // Ignore cache read errors
        }
        return null;
    };

    const saveToCache = (identifier: string, content: string): void => {
        if (!CACHE_GITHUB_SAMPLES) {
            return;
        }
        try {
            if (!existsSync(cacheDir)) {
                mkdirSync(cacheDir, { recursive: true });
            }
            const cacheFile = join(cacheDir, getCacheFileName(identifier));
            writeFileSync(cacheFile, content, "utf8");
        } catch (error) {
            console.warn(`Failed to cache ${identifier}:`, error);
        }
    };

    const fetchJson = async <T>(url: string): Promise<T> => {
        const response = await fetch(url, { headers: githubHeaders });
        if (response.status === 403) {
            const remaining = response.headers.get("x-ratelimit-remaining");
            const reset = response.headers.get("x-ratelimit-reset");
            throw new Error(
                `GitHub API rate limit exceeded (remaining=${remaining}, reset=${reset}).`
            );
        }
        if (!response.ok) {
            const body = await response.text();
            throw new Error(
                `GitHub API request failed (${response.status} ${response.statusText}): ${body}`
            );
        }
        return (await response.json()) as T;
    };

    const fetchText = async (url: string): Promise<string> => {
        const response = await fetch(url, { headers: githubHeaders });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(
                `Failed to fetch script content (${response.status} ${response.statusText}): ${body}`
            );
        }
        return response.text();
    };

    beforeAll(async () => {
        const loadFallbackSamples = (remaining: number) => {
            for (const relativePath of fallbackSamplePaths) {
                if (remaining <= 0) {
                    break;
                }
                const absolutePath = resolve(baseDir, relativePath);
                try {
                    const content = readFileSync(absolutePath, "utf8");
                    if (content.trim().length === 0) {
                        continue;
                    }
                    samples.push({
                        content,
                        identifier: `local:${relativePath}`,
                    });
                    remaining -= 1;
                } catch (error) {
                    console.warn(
                        `Unable to load fallback sample ${relativePath}:`,
                        error
                    );
                }
            }
        };

        if (ENABLE_GITHUB_SAMPLES) {
            // Try to load from cache first
            if (CACHE_GITHUB_SAMPLES && existsSync(cacheDir)) {
                try {
                    const cacheFiles = readdirSync(cacheDir);
                    for (const file of cacheFiles) {
                        if (samples.length >= GITHUB_SAMPLE_COUNT) {
                            break;
                        }
                        if (!file.endsWith(".ps1")) {
                            continue;
                        }
                        const content = readFileSync(
                            join(cacheDir, file),
                            "utf8"
                        );
                        if (content.trim().length === 0) {
                            continue;
                        }
                        samples.push({
                            content,
                            identifier: `cached:${file}`,
                        });
                    }
                    if (samples.length >= GITHUB_SAMPLE_COUNT) {
                        console.log(
                            `Loaded ${samples.length} samples from cache (${cacheDir})`
                        );
                    }
                } catch (error) {
                    console.warn("Failed to load cached samples:", error);
                }
            }

            // Fetch from GitHub if we need more samples
            if (samples.length < GITHUB_SAMPLE_COUNT) {
                const searchUrl =
                    `https://api.github.com/search/code?q=${ 
                    encodeURIComponent(GITHUB_QUERY) 
                    }&per_page=${Math.max(MAX_CANDIDATES, GITHUB_SAMPLE_COUNT)}&sort=indexed&order=desc`;
                let candidates: GitHubCodeItem[] = [];
                try {
                    const searchResults =
                        await fetchJson<GitHubSearchResponse>(searchUrl);
                    candidates = searchResults.items ?? [];
                } catch (error) {
                    console.warn("Unable to query GitHub samples:", error);
                }

                if (candidates.length === 0) {
                    console.warn(
                        "GitHub search returned no PowerShell candidates; falling back to local fixtures."
                    );
                }

                for (const candidate of candidates) {
                    if (samples.length >= GITHUB_SAMPLE_COUNT) {
                        break;
                    }
                    const identifier = `${candidate.repository.full_name}/${candidate.path}`;

                    // Check cache first
                    const cached = loadFromCache(identifier);
                    if (cached) {
                        samples.push({ content: cached, identifier });
                        continue;
                    }

                    // Try with refs/heads/main first, then master, then the SHA as fallback
                    const possibleRefs = [
                        "refs/heads/main",
                        "refs/heads/master",
                        candidate.sha,
                    ];
                    let content: null | string = null;

                    for (const ref of possibleRefs) {
                        const rawUrl = `https://raw.githubusercontent.com/${candidate.repository.full_name}/${ref}/${candidate.path}`;
                        try {
                            content = await fetchText(rawUrl);
                            break; // Success!
                        } catch {
                            // Try next ref
                            continue;
                        }
                    }

                    if (!content) {
                        console.warn(
                            `Skipping ${identifier}: file not found in main, master, or SHA ${candidate.sha}`
                        );
                        continue;
                    }

                    try {
                        if (
                            content.length < MIN_LENGTH ||
                            content.length > MAX_LENGTH
                        ) {
                            continue;
                        }
                        samples.push({ content, identifier });
                        saveToCache(identifier, content);
                    } catch (error) {
                        console.warn(`Skipping ${identifier}:`, error);
                    }
                }
            }
        }

        if (samples.length < GITHUB_SAMPLE_COUNT) {
            loadFallbackSamples(GITHUB_SAMPLE_COUNT - samples.length);
        }

        if (samples.length === 0) {
            throw new Error(
                "No PowerShell samples available for GitHub property tests"
            );
        }
    });

    it("formats GitHub PowerShell scripts without regressions", async () => {
        const runCount = Math.min(PROPERTY_RUNS, samples.length);
        await withProgress("githubSamples", runCount, async (tracker) => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom(...samples),
                    async (sample) => {
                        tracker.advance();
                        const originalAst = parsePowerShell(sample.content, {
                            tabWidth: 2,
                        } as never);
                        if (originalAst.type !== "Script") {
                            throw new Error(
                                `Original script did not produce a Script AST: ${sample.identifier}`
                            );
                        }

                        const formatted = await formatAndAssertRoundTrip(
                            sample.content,
                            {
                                filepath: sample.identifier,
                                parser: "powershell",
                                plugins: [plugin],
                            },
                            `githubSamples.formatted:${sample.identifier}`
                        );

                        const formattedAst = parsePowerShell(formatted, {
                            tabWidth: 2,
                        } as never);
                        if (formattedAst.type !== "Script") {
                            throw new Error(
                                `Formatted script did not produce a Script AST: ${sample.identifier}`
                            );
                        }

                        // FormatAndAssertRoundTrip already verified idempotence and parseability
                    }
                ),
                { numRuns: runCount }
            );
        });
    });
});

