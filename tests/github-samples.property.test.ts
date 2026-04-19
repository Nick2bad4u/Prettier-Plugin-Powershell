import type { IncomingHttpHeaders, IncomingMessage } from "node:http";

import * as fc from "fast-check";
import { createHash } from "node:crypto";
import { once } from "node:events";
import {
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    writeFileSync,
} from "node:fs";
import * as https from "node:https";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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

interface SampleCollection {
    readonly length: number;
    push: (sample: Readonly<SampledScript>) => number;
}

interface SampledScript {
    content: string;
    identifier: string;
}

const { env: testEnv } = process;

const PROPERTY_RUNS = Number.parseInt(
    testEnv.POWERSHELL_PROPERTY_RUNS ?? "25",
    10
);
const ENABLE_GITHUB_SAMPLES = testEnv.POWERSHELL_ENABLE_GITHUB_SAMPLES === "1";
const CACHE_GITHUB_SAMPLES = testEnv.POWERSHELL_CACHE_GITHUB_SAMPLES === "1";
const GITHUB_QUERY =
    testEnv.POWERSHELL_GITHUB_QUERY ??
    "extension:ps1 language:PowerShell size:1000..50000";
const GITHUB_SAMPLE_COUNT = Number.parseInt(
    testEnv.POWERSHELL_GITHUB_SAMPLE_COUNT ?? "8",
    10
);
const MAX_CANDIDATES = Number.parseInt(
    testEnv.POWERSHELL_GITHUB_MAX_CANDIDATES ?? "50",
    10
);
const MAX_LENGTH = Number.parseInt(
    testEnv.POWERSHELL_GITHUB_MAX_LENGTH ?? "200000",
    10
);
const MIN_LENGTH = Number.parseInt(
    testEnv.POWERSHELL_GITHUB_MIN_LENGTH ?? "500",
    10
);

const cacheDir = fileURLToPath(
    new URL("fixtures/github-cache/", import.meta.url)
);

const githubHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "prettier-plugin-powershell-tests",
};
const githubToken = testEnv.GITHUB_TOKEN;
if (githubToken !== undefined && githubToken.length > 0) {
    githubHeaders.Authorization = `token ${githubToken}`;
}

const graphemeSegmenter = new Intl.Segmenter("en", {
    granularity: "grapheme",
});

const sanitizeIdentifier = (identifier: string): string => {
    const sanitizedCharacters = [...graphemeSegmenter.segment(identifier)].map(
        ({ segment: character }) => {
            const isDecimalDigit = /\d/v.test(character);
            const isLowercaseLetter = /[a-z]/v.test(character);
            const isUppercaseLetter = /[A-Z]/v.test(character);
            const isDot = character === ".";
            const isDash = character === "-";

            return isDecimalDigit ||
                isLowercaseLetter ||
                isUppercaseLetter ||
                isDot ||
                isDash
                ? character
                : "_";
        }
    );

    return sanitizedCharacters.join("").slice(0, 50);
};

const getCacheFileName = (identifier: string): string => {
    const hash = createHash("sha256")
        .update(identifier)
        .digest("hex")
        .slice(0, 16);
    const safeName = sanitizeIdentifier(identifier);

    return `${safeName}-${hash}.ps1`;
};

const readUtf8IfNonEmpty = (absolutePath: string): null | string => {
    const content = readFileSync(absolutePath, "utf8");

    return content.trim().length > 0 ? content : null;
};

const loadFromCache = (identifier: string): null | string => {
    if (!CACHE_GITHUB_SAMPLES) {
        return null;
    }

    try {
        const cacheFile = path.join(cacheDir, getCacheFileName(identifier));

        return existsSync(cacheFile) ? readFileSync(cacheFile, "utf8") : null;
    } catch {
        return null;
    }
};

const saveToCache = (identifier: string, content: string): void => {
    if (!CACHE_GITHUB_SAMPLES) {
        return;
    }

    try {
        if (!existsSync(cacheDir)) {
            mkdirSync(cacheDir, { recursive: true });
        }

        const cacheFile = path.join(cacheDir, getCacheFileName(identifier));
        writeFileSync(cacheFile, content, "utf8");
    } catch (error) {
        console.warn(`Failed to cache ${identifier}:`, error);
    }
};

const getResponse = async (url: string): Promise<IncomingMessage> => {
    const request = https.get(url, { headers: githubHeaders });
    const responsePromise = (async (): Promise<IncomingMessage> => {
        const [response] = await once(request, "response");

        return response as IncomingMessage;
    })();
    const errorPromise = (async (): Promise<never> => {
        const [error] = await once(request, "error");

        throw error instanceof Error ? error : new Error(String(error));
    })();

    return Promise.race([responsePromise, errorPromise]);
};

const requestText = async (
    url: string
): Promise<{
    body: string;
    headers: IncomingHttpHeaders;
    status: number;
    statusText: string;
}> => {
    const response = await getResponse(url);
    const status = response.statusCode ?? 0;
    const statusText = response.statusMessage ?? "";
    let body = "";

    response.setEncoding("utf8");

    for await (const chunk of response as AsyncIterable<Buffer | string>) {
        body += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    }

    return {
        body,
        headers: response.headers,
        status,
        statusText,
    };
};

const fetchJson = async <T>(url: string): Promise<T> => {
    const response = await requestText(url);

    const stringifyHeaderValue = (
        value: readonly string[] | string | undefined
    ): string => {
        if (value === undefined) {
            return "unknown";
        }

        return typeof value === "string" ? value : value.join(",");
    };

    if (response.status === 403) {
        const remaining = response.headers["x-ratelimit-remaining"];
        const reset = response.headers["x-ratelimit-reset"];

        throw new Error(
            `GitHub API rate limit exceeded (remaining=${stringifyHeaderValue(remaining)}, reset=${stringifyHeaderValue(reset)}).`
        );
    }

    if (response.status < 200 || response.status >= 300) {
        throw new Error(
            `GitHub API request failed (${response.status} ${response.statusText}): ${response.body}`
        );
    }

    return JSON.parse(response.body) as T;
};

const fetchText = async (url: string): Promise<string> => {
    const response = await requestText(url);

    if (response.status < 200 || response.status >= 300) {
        throw new Error(
            `Failed to fetch script content (${response.status} ${response.statusText}): ${response.body}`
        );
    }

    return response.body;
};

const loadFallbackSamples = (
    samples: Readonly<SampleCollection>,
    limit: number
): void => {
    for (const relativePath of fallbackSamplePaths) {
        if (samples.length >= limit) {
            break;
        }

        const absolutePath = fileURLToPath(
            new URL(relativePath, import.meta.url)
        );

        try {
            const content = readUtf8IfNonEmpty(absolutePath);

            if (content !== null) {
                samples.push({
                    content,
                    identifier: `local:${relativePath}`,
                });
            }
        } catch (error) {
            console.warn(
                `Unable to load fallback sample ${relativePath}:`,
                error
            );
        }
    }
};

const loadCachedSamples = (
    samples: Readonly<SampleCollection>,
    limit: number
): void => {
    if (!CACHE_GITHUB_SAMPLES || !existsSync(cacheDir)) {
        return;
    }

    try {
        const cacheFiles = readdirSync(cacheDir);

        for (const file of cacheFiles) {
            const isCacheCandidate = file.endsWith(".ps1");

            if (samples.length < limit && isCacheCandidate) {
                const content = readUtf8IfNonEmpty(path.join(cacheDir, file));

                if (content !== null) {
                    samples.push({
                        content,
                        identifier: `cached:${file}`,
                    });
                }
            }
        }

        if (samples.length >= limit) {
            console.log(
                `Loaded ${samples.length} samples from cache (${cacheDir})`
            );
        }
    } catch (error) {
        console.warn("Failed to load cached samples:", error);
    }
};

const fetchGitHubCandidates = async (): Promise<GitHubCodeItem[]> => {
    const searchUrl = `https://api.github.com/search/code?q=${encodeURIComponent(GITHUB_QUERY)}&per_page=${Math.max(MAX_CANDIDATES, GITHUB_SAMPLE_COUNT)}&sort=indexed&order=desc`;

    try {
        const searchResults = await fetchJson<GitHubSearchResponse>(searchUrl);

        return searchResults.items ?? [];
    } catch (error) {
        console.warn("Unable to query GitHub samples:", error);
        return [];
    }
};

const fetchCandidateContent = async (
    candidate: Readonly<GitHubCodeItem>
): Promise<null | string> => {
    const possibleRefs = [
        "refs/heads/main",
        "refs/heads/master",
        candidate.sha,
    ];

    for (const ref of possibleRefs) {
        const rawUrl = `https://raw.githubusercontent.com/${candidate.repository.full_name}/${ref}/${candidate.path}`;

        try {
            return await fetchText(rawUrl);
        } catch {
            // Try the next ref candidate.
        }
    }

    return null;
};

const addGitHubSamples = async (
    samples: Readonly<SampleCollection>,
    limit: number
): Promise<void> => {
    const candidates = await fetchGitHubCandidates();

    if (candidates.length === 0) {
        console.warn(
            "GitHub search returned no PowerShell candidates; falling back to local fixtures."
        );
        return;
    }

    for (const candidate of candidates) {
        if (samples.length >= limit) {
            break;
        }

        const identifier = `${candidate.repository.full_name}/${candidate.path}`;
        const cached = loadFromCache(identifier);

        if (cached === null) {
            const content = await fetchCandidateContent(candidate);

            if (content === null) {
                console.warn(
                    `Skipping ${identifier}: file not found in main, master, or SHA ${candidate.sha}`
                );
            } else if (
                content.length >= MIN_LENGTH &&
                content.length <= MAX_LENGTH
            ) {
                samples.push({ content, identifier });
                saveToCache(identifier, content);
            }
        } else {
            samples.push({ content: cached, identifier });
        }
    }
};

const fallbackSamplePaths = [
    "fixtures/github-fallback-simple.ps1",
    "fixtures/sample-unformatted.ps1",
    "fixtures/sample-formatted.ps1",
];

describe("real-world GitHub PowerShell samples", () => {
    const samples: SampledScript[] = [];
    let samplesLoadPromise: null | Promise<void> = null;

    const ensureSamplesLoaded = async (): Promise<void> => {
        if (samplesLoadPromise !== null) {
            await samplesLoadPromise;
            return;
        }

        samplesLoadPromise = (async (): Promise<void> => {
            if (ENABLE_GITHUB_SAMPLES) {
                loadCachedSamples(samples, GITHUB_SAMPLE_COUNT);

                if (samples.length < GITHUB_SAMPLE_COUNT) {
                    await addGitHubSamples(samples, GITHUB_SAMPLE_COUNT);
                }
            }

            if (samples.length < GITHUB_SAMPLE_COUNT) {
                loadFallbackSamples(samples, GITHUB_SAMPLE_COUNT);
            }

            if (samples.length === 0) {
                throw new Error(
                    "No PowerShell samples available for GitHub property tests"
                );
            }
        })();

        await samplesLoadPromise;
    };

    it("formats GitHub PowerShell scripts without regressions", async () => {
        expect.hasAssertions();

        await ensureSamplesLoaded();

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
