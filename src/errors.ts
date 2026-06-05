import { arrayAt, arrayJoin, stringSplit } from "ts-extras";

import { PowerShellWarning } from "./warning.js";

/**
 * Shape describing one anti-pattern detection rule.
 */
export interface AntiPatternSpec {
    message: string;
    pattern: RegExp;
    suggestion?: string;
    type: WarningType;
}

/**
 * Deprecated syntax detection rule.
 */
export interface DeprecatedSyntaxSpec {
    message: string;
    modern: string;
    pattern: RegExp;
}

/**
 * Classification categories used by non-fatal parser and style warnings.
 */
export type WarningType =
    | "anti-pattern"
    | "best-practice"
    | "deprecated-syntax"
    | "performance"
    | "style";

/**
 * Custom error class carrying source location metadata for parse failures.
 */
export class PowerShellParseError extends Error {
    /** The column offset (1-based) where parsing failed. */
    public readonly column: number;

    /** The line number (1-based) where parsing failed. */
    public readonly line: number;

    /** The character offset where parsing failed. */
    public readonly position: number;

    /** The original source text. */
    public readonly source: string;

    /**
     * Initializes a parse error with location details.
     */
    public constructor(
        message: string,
        source: string,
        position: number,
        line: number,
        column: number
    ) {
        super(message);
        this.name = "PowerShellParseError";
        this.source = source;
        this.position = position;
        this.line = line;
        this.column = column;
    }

    /**
     * Gets a snippet of source text around the failing line.
     *
     * @param contextLines - Number of surrounding lines to include on each
     *   side.
     *
     * @returns Context snippet with an indicator prefix for the failing line.
     */
    public getContext(contextLines = 2): string {
        const lines = stringSplit(this.source, "\n");
        const startLine = Math.max(0, this.line - contextLines - 1);
        const endLine = Math.min(lines.length, this.line + contextLines);

        return arrayJoin(
            lines.slice(startLine, endLine).map((lineValue, index) => {
                const lineNumber = startLine + index + 1;
                const isErrorLine = lineNumber === this.line;
                const prefix = isErrorLine ? ">" : " ";

                return `${prefix} ${lineNumber.toString().padStart(4)} | ${lineValue}`;
            }),
            "\n"
        );
    }

    /**
     * Formats the parse error with line context.
     *
     * @returns Human-readable parse error string.
     */
    public override toString(): string {
        const lines = stringSplit(this.source, "\n");
        const errorLine = lines[this.line - 1] ?? "";
        const pointer = `${" ".repeat(this.column - 1)}^`;

        return `${this.name}: ${this.message}
  at line ${this.line}, column ${this.column}

  ${errorLine}
  ${pointer}
`;
    }
}

/**
 * Calculates line and column information from a source offset.
 *
 * @param source - Full source text.
 * @param position - Character offset within source.
 *
 * @returns One-based line and column coordinates.
 */
export const getLineAndColumn = (
    source: string,
    position: number
): { column: number; line: number } => {
    const lines = stringSplit(source.slice(0, Math.max(0, position)), "\n");

    return {
        column: (arrayAt(lines, -1) ?? "").length + 1,
        line: lines.length,
    };
};

/**
 * Creates a parse error with derived line and column information.
 *
 * @param message - Error message.
 * @param source - Original source text.
 * @param position - Character offset where parsing failed.
 *
 * @returns Constructed parse error.
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
 * Pattern rules for common PowerShell anti-patterns.
 */
export const ANTI_PATTERNS: AntiPatternSpec[] = [
    {
        message: "Avoid Write-Host; use Write-Output instead",
        pattern: /\bwrite-host\b/giv,
        suggestion:
            "Write-Host bypasses the pipeline. Use Write-Output for objects or Write-Information for informational messages.",
        type: "anti-pattern",
    },
    {
        message: "Avoid Invoke-Expression; it's a security risk",
        pattern: /\binvoke-expression\b/giv,
        suggestion:
            "Use safer alternatives like & operator, dot-sourcing, or proper function calls.",
        type: "anti-pattern",
    },
    {
        message: "Consider using $? in combination with proper error handling",
        pattern: /\$\?/gv,
        suggestion:
            "Use try/catch blocks or -ErrorAction for better error control.",
        type: "best-practice",
    },
    {
        message: "Use -First parameter on cmdlet instead of Select-Object",
        pattern:
            /\bget-[\p{L}\p{N}_]+\s*\|\s*where-object[^\n\r]*\|\s*select-object\s+-first\s+1/giv,
        suggestion:
            "Many cmdlets support -First parameter for better performance.",
        type: "performance",
    },
    {
        message:
            "Consider using ForEach-Object in pipeline for memory efficiency",
        pattern: /\bforeach\s*\(\s*\$[\p{L}\p{N}_]+\s+in\s+get-/giv,
        suggestion: "Get-X | ForEach-Object { } processes items one at a time.",
        type: "performance",
    },
];

/**
 * Pattern rules for deprecated or discouraged PowerShell syntax.
 */
export const DEPRECATED_SYNTAX: DeprecatedSyntaxSpec[] = [
    {
        message: "Subexpression operator is fine, but ensure proper nesting",
        modern: "$(...) subexpressions",
        pattern: /\$\(/gv,
    },
    {
        message: "Consider assigning to $null instead of [void] for clarity",
        modern: "$null = ...",
        pattern: /\[void/giv,
    },
];

/**
 * Detects anti-patterns and deprecated syntax in PowerShell code.
 *
 * @param source - Source code to inspect.
 *
 * @returns Collected warnings.
 */
export function detectIssues(source: string): PowerShellWarning[] {
    const warnings: PowerShellWarning[] = [];

    for (const antiPattern of ANTI_PATTERNS) {
        antiPattern.pattern.lastIndex = 0;

        let match: null | RegExpExecArray = antiPattern.pattern.exec(source);
        while (match !== null) {
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
            match = antiPattern.pattern.exec(source);
        }
    }

    return warnings;
}
