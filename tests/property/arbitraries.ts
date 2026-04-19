import * as fc from "fast-check";

const letters = "abcdefghijklmnopqrstuvwxyz";
const lettersUpper = letters.toUpperCase();
const digits = "0123456789";
const symbolChars = "-_";
const graphemeSegmenter = new Intl.Segmenter("en", {
    granularity: "grapheme",
});

const splitGraphemes = (value: string): string[] => {
    const parts: string[] = [];

    for (const segment of graphemeSegmenter.segment(value)) {
        parts.push(segment.segment);
    }

    return parts;
};

const letterCharacters = splitGraphemes(letters);
const upperLetterCharacters = splitGraphemes(lettersUpper);
const digitCharacters = splitGraphemes(digits);
const symbolCharacters = splitGraphemes(symbolChars);

const identifierStartArb: fc.Arbitrary<string> = fc.constantFrom<string>(
    ...letterCharacters,
    ...upperLetterCharacters,
    "_"
);
const identifierCharArb: fc.Arbitrary<string> = fc.constantFrom<string>(
    ...letterCharacters,
    ...upperLetterCharacters,
    ...digitCharacters,
    ...symbolCharacters
);

const baseIdentifierArb: fc.Arbitrary<string> = fc
    .tuple(identifierStartArb, fc.array(identifierCharArb, { maxLength: 7 }))
    .map(
        ([
            head,
            tail,
        ]: readonly [
            string,
            readonly string[],
        ]) => `${head}${tail.join("")}`
    );

const capitalizedIdentifierArb: fc.Arbitrary<string> = baseIdentifierArb.map(
    (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
);

const variableNameArb: fc.Arbitrary<string> = baseIdentifierArb.map(
    (name: string) => `$${name}`
);

const stringCharArb: fc.Arbitrary<string> = fc.constantFrom<string>(
    ...letterCharacters,
    ...upperLetterCharacters,
    ...digitCharacters,
    " ",
    ".",
    "/",
    ":",
    ",",
    ";",
    "|",
    "?",
    "!",
    "-",
    "_",
    "+",
    "*",
    "=",
    "[",
    "]"
);

const singleQuotedStringArb: fc.Arbitrary<string> = fc
    .array(stringCharArb, { maxLength: 18 })
    .map((chars: readonly string[]) => {
        const content = chars.join("");
        return `'${content.replaceAll("'", "''")}'`;
    });

const doubleQuotedStringArb: fc.Arbitrary<string> = fc
    .array(stringCharArb, { maxLength: 18 })
    .map((chars: readonly string[]) => `"${chars.join("")}"`);

const hereStringLiteralArb: fc.Arbitrary<string> = fc
    .array(stringCharArb, { maxLength: 40, minLength: 3 })
    .map((chars: readonly string[]) => `@"\n${chars.join("")}\n"@`);

const numberLiteralArb: fc.Arbitrary<string> = fc
    .integer({ max: 999, min: -999 })
    .map(String);
const booleanLiteralArb: fc.Arbitrary<string> = fc.constantFrom(
    "true",
    "false"
);

const simpleValueArb: fc.Arbitrary<string> = fc.oneof(
    singleQuotedStringArb,
    doubleQuotedStringArb,
    numberLiteralArb,
    booleanLiteralArb
);

const variableReferenceArb: fc.Arbitrary<string> = variableNameArb;

const arrayLiteralArb: fc.Arbitrary<string> = fc
    .array(simpleValueArb, { maxLength: 5 })
    .map((elements) => {
        if (elements.length === 0) {
            return "@()";
        }

        const separator = elements.length > 1 ? ", " : "";

        return `@(${elements.join(separator)})`;
    });

interface HashtableEntry {
    key: string;
    value: string;
}

const hashtableEntryArb: fc.Arbitrary<HashtableEntry> = fc
    .tuple(capitalizedIdentifierArb, simpleValueArb)
    .map(
        ([
            key,
            value,
        ]: readonly [
            string,
            string,
        ]) => ({ key, value })
    );

const formatHashtableEntry = ({
    key,
    value,
}: Readonly<HashtableEntry>): string => {
    if (!value.includes("\n")) {
        return `${key} = ${value}`;
    }

    const valueLines = value.split("\n");
    const indentedValue = valueLines
        .map((line) => {
            if (line.length === 0) {
                return "";
            }
            const trimmed = line.trim();
            if (HEREDOC_CLOSERS.has(trimmed)) {
                return trimmed;
            }
            return `  ${line}`;
        })
        .join("\n");

    return `${key} =\n${indentedValue}`;
};

const hashtableLiteralArb: fc.Arbitrary<string> = fc
    .array(hashtableEntryArb, { maxLength: 5 })
    .map((entries: readonly Readonly<HashtableEntry>[]) => {
        if (entries.length === 0) {
            return "@{}";
        }

        const hasMultiline = entries.some(({ value }) => value.includes("\n"));
        if (!hasMultiline) {
            const inlineEntries = entries
                .map(({ key, value }) => `${key} = ${value}`)
                .join("; ");
            return `@{ ${inlineEntries} }`;
        }

        const blockEntries = entries
            .map((entry) =>
                formatHashtableEntry(entry)
                    .split("\n")
                    .map((line) => (line.length === 0 ? "" : `  ${line}`))
                    .join("\n")
            )
            .join("\n");

        return `@{\n${blockEntries}\n}`;
    });

const expressionValueArb: fc.Arbitrary<string> = fc.oneof(
    simpleValueArb,
    variableReferenceArb,
    arrayLiteralArb,
    hashtableLiteralArb
);

const commentArb: fc.Arbitrary<string> = fc
    .array(stringCharArb, { maxLength: 40, minLength: 3 })
    .map((chars: readonly string[]) => `# ${chars.join("")}`);

const comparisonOperatorArb: fc.Arbitrary<string> = fc.constantFrom(
    "-gt",
    "-ge",
    "-lt",
    "-le",
    "-eq",
    "-ne",
    "-like"
);

const propertyReferenceArb: fc.Arbitrary<string> = fc
    .array(baseIdentifierArb, { maxLength: 2 })
    .map((parts) => (parts.length === 0 ? "$_" : `$_.${parts.join(".")}`));

const predicateScriptBlockArb: fc.Arbitrary<string> = fc
    .tuple(propertyReferenceArb, comparisonOperatorArb, expressionValueArb)
    .map(
        ([
            reference,
            op,
            value,
        ]) => `{ ${reference} ${op} ${value} }`
    );

const commandNameArb: fc.Arbitrary<string> = fc.constantFrom<string>(
    "Write-Output",
    "Write-Host",
    "Write-Warning",
    "Write-Verbose",
    "Write-Error",
    "Write-Information",
    "Get-ChildItem",
    "Get-Item",
    "Get-Content",
    "Set-Content",
    "Measure-Object",
    "Select-Object",
    "Sort-Object",
    "Where-Object",
    "ForEach-Object",
    "Test-Path",
    "New-Item",
    "Remove-Item",
    "Invoke-Command",
    "Get-Process",
    "gci",
    "ls",
    "dir"
);

const commandArgumentArb: fc.Arbitrary<string> = fc.oneof(
    expressionValueArb,
    variableReferenceArb
);

const commandStatementArb: fc.Arbitrary<string> = fc
    .tuple(
        commandNameArb,
        fc.array(commandArgumentArb, { maxLength: 3 }),
        fc.option(predicateScriptBlockArb, { nil: undefined })
    )
    .map(
        ([
            cmdlet,
            args,
            predicate,
        ]: readonly [
            string,
            readonly string[],
            (
                | string
                | undefined
            ),
        ]) => {
            const pieces = [cmdlet];
            if (args.length > 0) {
                pieces.push(args.join(" "));
            }
            if (predicate !== undefined) {
                pieces.push(predicate);
            }
            return pieces.join(" ");
        }
    );

const assignmentStatementArb: fc.Arbitrary<string> = fc
    .tuple(variableNameArb, expressionValueArb)
    .map(
        ([
            variable,
            value,
        ]: readonly [
            string,
            string,
        ]) => `${variable} = ${value}`
    );

const pipelineStageArb: fc.Arbitrary<string> = fc.oneof(
    fc.constant("Out-String"),
    fc.constant("Measure-Object"),
    fc.constant("Measure-Object -Average"),
    fc.constant("Select-Object Name, Length"),
    fc.constant("Sort-Object Length"),
    predicateScriptBlockArb.map((predicate) => `Where-Object ${predicate}`),
    fc.constant("ForEach-Object { $_ }")
);

const pipelineStatementArb: fc.Arbitrary<string> = fc
    .tuple(
        commandArgumentArb,
        fc.array(pipelineStageArb, { maxLength: 3, minLength: 1 })
    )
    .map(
        ([
            input,
            stages,
        ]: readonly [
            string,
            readonly string[],
        ]) => {
            const pipelineHead = `Write-Output ${input}`;
            return [pipelineHead, ...stages].join(" | ");
        }
    );

const hereStringAssignmentArb: fc.Arbitrary<string> = fc
    .tuple(variableNameArb, hereStringLiteralArb)
    .map(
        ([
            variable,
            literal,
        ]: readonly [
            string,
            string,
        ]) => `${variable} = ${literal}`
    );

const hereStringCommandArb: fc.Arbitrary<string> = hereStringLiteralArb.map(
    (literal) => `Write-Output ${literal}`
);

const HEREDOC_CLOSERS = new Set(['"@', "'@"]);

const indent = (content: string, spaces = 2): string => {
    const padding = " ".repeat(spaces);
    return content
        .split("\n")
        .map((line) => {
            if (line.length === 0) {
                return "";
            }
            const trimmed = line.trim();
            if (HEREDOC_CLOSERS.has(trimmed)) {
                return trimmed;
            }
            return `${padding}${line}`;
        })
        .join("\n");
};

const conditionArb: fc.Arbitrary<string> = fc.oneof(
    fc
        .tuple(variableReferenceArb, comparisonOperatorArb, expressionValueArb)
        .map(
            ([
                variable,
                op,
                value,
            ]: readonly [
                string,
                string,
                string,
            ]) => `${variable} ${op} ${value}`
        ),
    propertyReferenceArb
);

const parameterTypeArb: fc.Arbitrary<string> = fc.constantFrom(
    "[string]",
    "[int]",
    "[bool]",
    "[object]",
    "[double]"
);

const parameterDeclarationArb: fc.Arbitrary<string> = fc
    .tuple(parameterTypeArb, variableNameArb)
    .map(
        ([
            type,
            variable,
        ]: readonly [
            string,
            string,
        ]) => `${type} ${variable}`
    );

const lineEndingArb: fc.Arbitrary<string> = fc.constantFrom("\n", "\r\n");

interface LetrecShape {
    block: string;
    nonEmptyStatement: string;
    script: string;
    statement: string;
    structuredScript: string;
}

const arbitraries = fc.letrec<LetrecShape>((tie) => {
    const block: fc.Arbitrary<string> = fc
        .array(tie("statement"), { maxLength: 6, minLength: 1 })
        .filter((statements: readonly string[]) =>
            statements.some((statement) => statement.trim().length > 0)
        )
        .map((statements: readonly string[]) => statements.join("\n"));

    const elseIfClausesArb: fc.Arbitrary<[string, string][]> = fc.array(
        fc.tuple(conditionArb, tie("block")),
        { maxLength: 2 }
    );

    const elseBodyArb: fc.Arbitrary<string | undefined> = fc.option(
        tie("block"),
        {
            nil: undefined,
        }
    );

    const ifStatementArb: fc.Arbitrary<string> = fc
        .record({
            condition: conditionArb,
            elseBody: elseBodyArb,
            elseifClauses: elseIfClausesArb,
            thenBody: tie("block"),
        })
        .map(({ condition, elseBody, elseifClauses, thenBody }) => {
            const segments: string[] = [
                `if (${condition}) {\n${indent(thenBody)}\n}`,
            ];
            for (const [elseifCondition, elseifBody] of elseifClauses) {
                segments.push(
                    `elseif (${elseifCondition}) {\n${indent(elseifBody)}\n}`
                );
            }
            if (elseBody !== undefined) {
                segments.push(`else {\n${indent(elseBody)}\n}`);
            }
            return segments.join("\n");
        });

    const paramBlockArb: fc.Arbitrary<string | undefined> = fc.option(
        fc
            .array(parameterDeclarationArb, { maxLength: 3, minLength: 1 })
            .map((parameters) => {
                const lines = parameters.map((parameter) => indent(parameter));
                return `param(\n${lines.join(",\n")}\n)`;
            }),
        { nil: undefined }
    );

    const functionSectionsArb: fc.Arbitrary<string[]> = fc
        .subarray(
            [
                "Begin",
                "Process",
                "End",
            ] as const,
            {
                maxLength: 3,
                minLength: 0,
            }
        )
        .chain((sections) =>
            fc
                .array(tie("block"), {
                    maxLength: sections.length,
                    minLength: sections.length,
                })
                .map((bodies) =>
                    sections.map(
                        (section, index) =>
                            `${section} {\n${indent(bodies[index] ?? "")}\n}`
                    )
                )
        );

    const functionVerbArb: fc.Arbitrary<string> = fc.constantFrom(
        "Get",
        "Set",
        "Invoke",
        "New",
        "Test"
    );

    const functionStatementArb: fc.Arbitrary<string> = fc
        .record({
            body: tie("block"),
            name: capitalizedIdentifierArb,
            paramBlock: paramBlockArb,
            sections: functionSectionsArb,
            verb: functionVerbArb,
        })
        .map(({ body, name, paramBlock, sections, verb }) => {
            const innerSegments: string[] = [];
            if (paramBlock !== undefined) {
                innerSegments.push(indent(paramBlock));
            }
            innerSegments.push(indent(body));
            for (const section of sections) {
                innerSegments.push(indent(section));
            }
            return `function ${verb}-${name} {\n${innerSegments.join("\n")}\n}`;
        });

    const catchTypeArb: fc.Arbitrary<string | undefined> = fc.option(
        fc.constantFrom(
            "[System.Exception]",
            "[System.IO.IOException]",
            "[System.FormatException]"
        ),
        { nil: undefined }
    );

    const tryCatchStatementArb: fc.Arbitrary<string> = fc
        .record({
            catchBody: tie("block"),
            catchType: catchTypeArb,
            finallyBody: fc.option(tie("block"), { nil: undefined }),
            tryBody: tie("block"),
        })
        .map(({ catchBody, catchType, finallyBody, tryBody }) => {
            const clauses = [`try {\n${indent(tryBody)}\n}`];
            const catchHeader =
                catchType === undefined ? "catch" : `catch ${catchType}`;
            clauses.push(`${catchHeader} {\n${indent(catchBody)}\n}`);
            if (finallyBody !== undefined) {
                clauses.push(`finally {\n${indent(finallyBody)}\n}`);
            }
            return clauses.join("\n");
        });

    const foreachStatementArb: fc.Arbitrary<string> = fc
        .record({
            body: tie("block"),
            item: variableNameArb,
            source: fc.oneof(arrayLiteralArb, variableReferenceArb),
        })
        .map(
            ({ body, item, source }) =>
                `foreach (${item} in ${source}) {\n${indent(body)}\n}`
        );

    const whileStatementArb: fc.Arbitrary<string> = fc
        .record({
            body: tie("block"),
            condition: conditionArb,
        })
        .map(
            ({ body, condition }) =>
                `while (${condition}) {\n${indent(body)}\n}`
        );

    const doWhileStatementArb: fc.Arbitrary<string> = fc
        .record({
            body: tie("block"),
            condition: conditionArb,
        })
        .map(
            ({ body, condition }) =>
                `do {\n${indent(body)}\n} while (${condition})`
        );

    const simpleStatementArb: fc.Arbitrary<string> = fc.oneof(
        assignmentStatementArb,
        commandStatementArb,
        pipelineStatementArb,
        commentArb,
        hereStringAssignmentArb,
        hereStringCommandArb
    );

    const nonEmptyStatementArb: fc.Arbitrary<string> = fc.oneof(
        simpleStatementArb,
        ifStatementArb,
        functionStatementArb,
        tryCatchStatementArb,
        foreachStatementArb,
        whileStatementArb,
        doWhileStatementArb
    );

    const statementArb: fc.Arbitrary<string> = fc.oneof(
        nonEmptyStatementArb,
        fc.constant("")
    );

    const scriptArb: fc.Arbitrary<string> = fc
        .tuple(
            nonEmptyStatementArb,
            fc.array(statementArb, { maxLength: 18 }),
            lineEndingArb,
            fc.constantFrom("", "\n")
        )
        .map(
            ([
                first,
                rest,
                newline,
                trailing,
            ]): string => {
                const joined = [first, ...rest].join("\n");
                const normalised =
                    newline === "\n"
                        ? joined
                        : joined.replaceAll("\n", newline);
                return trailing.length > 0
                    ? `${normalised}${newline}`
                    : normalised;
            }
        );

    const structuredScriptArb: fc.Arbitrary<string> = scriptArb.filter(
        (script) => script.trim().length > 0
    );

    return {
        block,
        nonEmptyStatement: nonEmptyStatementArb,
        script: scriptArb,
        statement: statementArb,
        structuredScript: structuredScriptArb,
    };
});

export const scriptArbitrary: fc.Arbitrary<string> = arbitraries.script;
export const structuredScriptArbitrary: fc.Arbitrary<string> =
    arbitraries.structuredScript;
