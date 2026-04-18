/**
 * Common PowerShell anti-patterns to detect and warn about.
 */
export type AntiPatternSpec = {
    message: string;
    pattern: RegExp;
    suggestion?: string;
    type: WarningType;
};

export type WarningType =
    | "anti-pattern"
    | "best-practice"
    | "deprecated-syntax"
    | "performance"
    | "style";

/**
 * Custom error class for PowerShell parsing errors with source location
 * information.
 */
export class PowerShellParseError extends Error {
    constructor(
        message: string,
        public readonly source: string,
        public readonly position: number,
        public readonly line: number,
        public readonly column: number
    ) {
        super(message);
        this.name = "PowerShellParseError";

        // Maintain proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            
        }
    }

    /**
     * Gets a snippet of the source code around the error location.
     */
    getContext(contextLines = 2): string {
        const lines = this.source.split("\n");
        const startLine = Math.max(0, this.line - contextLines - 1);
        const endLine = Math.min(lines.length, this.line + contextLines);

        const contextSnippet = lines
            .slice(startLine, endLine)
            .map((line, idx) => {
                const lineNum = startLine + idx + 1;
                const isErrorLine = lineNum === this.line;
                const prefix = isErrorLine ? ">" : " ";
                return `${prefix} ${lineNum.toString().padStart(4)} | ${line}`;
            })
            .join("\n");

        return contextSnippet;
    }

    /**
     * Creates a formatted error message with source context.
     */
    toString(): string {
        const lines = this.source.split("\n");
        const errorLine = lines[this.line - 1] || "";
        const pointer = `${" ".repeat(this.column - 1)  }^`;

        return `${this.name}: ${this.message}
  at line ${this.line}, column ${this.column}

  ${errorLine}
  ${pointer}
`;
    }
}

/**
 * Warning class for non-fatal issues like deprecated syntax.
 */
export class PowerShellWarning {
    constructor(
        public readonly message: string,
        public readonly type: WarningType,
        public readonly position: number,
        public readonly line: number,
        public readonly column: number,
        public readonly suggestion?: string
    ) {}

    toString(): string {
        let result = `Warning [${this.type}]: ${this.message}`;
        if (this.suggestion) {
            result += `\n  Suggestion: ${this.suggestion}`;
        }
        result += `\n  at line ${this.line}, column ${this.column}`;
        return result;
    }
}

/**
 * Creates a parse error with proper source location.
 */
export function createParseError(
    message: string,
    source: string,
    position: number
): PowerShellParseError {
    const { column, line } = getLineAndColumn(source, position);
    return new PowerShellParseError(message, source, position, line, column);
}

/**
 * Calculates line and column number from a position in the source.
 */
export function getLineAndColumn(
    source: string,
    position: number
): { column: number; line: number; } {
    const lines = source.slice(0, Math.max(0, position)).split("\n");
    return {
        column: lines.at(-1).length + 1,
        line: lines.length,
    };
}
export const ANTI_PATTERNS: AntiPatternSpec[] = [
    {
        message: "Avoid Write-Host; use Write-Output instead",
        pattern: /write-host/gi,
        suggestion:
            "Write-Host bypasses the pipeline. Use Write-Output for objects or Write-Information for informational messages.",
        type: "anti-pattern" as WarningType,
    },
    {
        message: "Avoid Invoke-Expression; it's a security risk",
        pattern: /invoke-expression/gi,
        suggestion:
            "Use safer alternatives like & operator, dot-sourcing, or proper function calls.",
        type: "anti-pattern" as WarningType,
    },
    {
        message: "Consider using $? in combination with proper error handling",
        pattern: /\$\?/g,
        suggestion:
            "Use try/catch blocks or -ErrorAction for better error control.",
        type: "best-practice" as WarningType,
    },
    {
        message: "Use -First parameter on cmdlet instead of Select-Object",
        pattern:
            /get-\w+\s*\|\s*where-object.*\|\s*select-object\s+-first\s+1/gi,
        suggestion:
            "Many cmdlets support -First parameter for better performance.",
        type: "performance" as WarningType,
    },
    {
        message:
            "Consider using ForEach-Object in pipeline for memory efficiency",
        pattern: /foreach\s*\(\s*\$\w+\s+in\s+get-/gi,
        suggestion: "Get-X | ForEach-Object { } processes items one at a time.",
        type: "performance" as WarningType,
    },
];

/**
 * Deprecated PowerShell syntax patterns.
 */
export type DeprecatedSyntaxSpec = {
    message: string;
    modern: string;
    pattern: RegExp;
};
export const DEPRECATED_SYNTAX: DeprecatedSyntaxSpec[] = [
    {
        message: "Subexpression operator is fine, but ensure proper nesting",
        modern: "$(...) subexpressions",
        pattern: /\$\(/g,
    },
    {
        message: "Consider assigning to $null instead of [void] for clarity",
        modern: "$null = ...",
        pattern: /\[void\]/gi,
    },
];

/**
 * Detects anti-patterns and deprecated syntax in PowerShell code.
 */
export function detectIssues(source: string): PowerShellWarning[] {
    const warnings: PowerShellWarning[] = [];

    // Check for anti-patterns
    for (const antiPattern of ANTI_PATTERNS) {
        const regex = new RegExp(antiPattern.pattern.source, "gi");
        let match;
        while ((match = regex.exec(source)) !== null) {
            const { column, line } = getLineAndColumn(source, match.index);
            warnings.push(
                new PowerShellWarning(
                    antiPattern.message,
                    antiPattern.type,
                    match.index,
                    line,
                    column,
                    antiPattern.suggestion
                )
            );
        }
    }

    return warnings;
}
