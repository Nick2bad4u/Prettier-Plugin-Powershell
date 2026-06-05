import { isDefined } from "ts-extras";

import type { WarningType } from "./errors.js";

/**
 * Warning class for non-fatal diagnostics.
 */
export class PowerShellWarning {
    /** The column offset (1-based) of the warning. */
    public readonly column: number;

    /** The line number (1-based) of the warning. */
    public readonly line: number;

    /** The warning description. */
    public readonly message: string;

    /** The character offset of the warning. */
    public readonly position: number;

    /** An optional remediation hint. */
    public readonly suggestion?: string;

    /** The warning category. */
    public readonly type: WarningType;

    /**
     * Creates a warning instance.
     */
    public constructor(
        message: string,
        type: WarningType,
        position: number,
        line: number,
        column: number,
        suggestion?: string
    ) {
        this.message = message;
        this.type = type;
        this.position = position;
        this.line = line;
        this.column = column;
        if (isDefined(suggestion)) {
            this.suggestion = suggestion;
        }
    }

    /**
     * Formats the warning for display.
     */
    public toString(): string {
        let result = `Warning [${this.type}]: ${this.message}`;

        if (isDefined(this.suggestion) && this.suggestion.length > 0) {
            result += `\n  Suggestion: ${this.suggestion}`;
        }

        result += `\n  at line ${this.line}, column ${this.column}`;

        return result;
    }
}
