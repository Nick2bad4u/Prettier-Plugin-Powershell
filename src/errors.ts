/**
 * Custom error class for PowerShell parsing errors with source location information.
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
            Error.captureStackTrace(this, PowerShellParseError);
        }
    }

    /**
     * Creates a formatted error message with source context.
     */
    toString(): string {
        const lines = this.source.split("\n");
        const errorLine = lines[this.line - 1] || "";
        const pointer = " ".repeat(this.column - 1) + "^";

        return `${this.name}: ${this.message}
  at line ${this.line}, column ${this.column}

  ${errorLine}
  ${pointer}
`;
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

export type WarningType =
    | "deprecated-syntax"
    | "anti-pattern"
    | "performance"
    | "style"
    | "best-practice";

/**
 * Calculates line and column number from a position in the source.
 */
export function getLineAndColumn(
    source: string,
    position: number
): { line: number; column: number } {
    const lines = source.substring(0, position).split("\n");
    return {
        line: lines.length,
        column: lines[lines.length - 1].length + 1,
    };
}

/**
 * Creates a parse error with proper source location.
 */
export function createParseError(
    message: string,
    source: string,
    position: number
): PowerShellParseError {
    const { line, column } = getLineAndColumn(source, position);
    return new PowerShellParseError(message, source, position, line, column);
}

/**
 * Common PowerShell anti-patterns to detect and warn about.
 */
export const ANTI_PATTERNS = [
    {
        pattern: /Write-Host/gi,
        type: "anti-pattern" as WarningType,
        message: "Avoid Write-Host; use Write-Output instead",
        suggestion:
            "Write-Host bypasses the pipeline. Use Write-Output for objects or Write-Information for informational messages.",
    },
    {
        pattern: /Invoke-Expression/gi,
        type: "anti-pattern" as WarningType,
        message: "Avoid Invoke-Expression; it's a security risk",
        suggestion:
            "Use safer alternatives like & operator, dot-sourcing, or proper function calls.",
    },
    {
        pattern: /\$\?/g,
        type: "best-practice" as WarningType,
        message: "Consider using $? in combination with proper error handling",
        suggestion: "Use try/catch blocks or -ErrorAction for better error control.",
    },
    {
        pattern: /Get-\w+\s*\|\s*Where-Object.*\|\s*Select-Object\s+-First\s+1/gi,
        type: "performance" as WarningType,
        message: "Use -First parameter on cmdlet instead of Select-Object",
        suggestion:
            "Many cmdlets support -First parameter for better performance.",
    },
    {
        pattern: /foreach\s*\(\s*\$\w+\s+in\s+Get-/gi,
        type: "performance" as WarningType,
        message: "Consider using ForEach-Object in pipeline for memory efficiency",
        suggestion: "Get-X | ForEach-Object { } processes items one at a time.",
    },
];

/**
 * Deprecated PowerShell syntax patterns.
 */
export const DEPRECATED_SYNTAX = [
    {
        pattern: /\$\(/g,
        modern: "$(...) subexpressions",
        message: "Subexpression operator is fine, but ensure proper nesting",
    },
    {
        pattern: /\[void\]/gi,
        modern: "$null = ...",
        message: "Consider assigning to $null instead of [void] for clarity",
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
            const { line, column } = getLineAndColumn(source, match.index);
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
