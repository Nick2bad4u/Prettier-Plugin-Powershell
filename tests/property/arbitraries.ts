import * as fc from "fast-check";

const letters = "abcdefghijklmnopqrstuvwxyz";
const lettersUpper = letters.toUpperCase();
const digits = "0123456789";
const symbolChars = "-_";

const identifierStartArb: fc.Arbitrary<string> = fc.constantFrom<string>(
    ...letters,
    ...lettersUpper,
    "_"
);
const identifierCharArb: fc.Arbitrary<string> = fc.constantFrom<string>(
    ...letters,
    ...lettersUpper,
    ...digits,
    ...symbolChars
);

const baseIdentifierArb: fc.Arbitrary<string> = fc
    .tuple(identifierStartArb, fc.array(identifierCharArb, { maxLength: 7 }))
    .map(
        ([
            head,
            tail,
        ]: [
            string,
            string[],
        ]) => `${head}${tail.join("")}`
    );

const capitalizedIdentifierArb: fc.Arbitrary<string> = baseIdentifierArb.map(
    (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
);

const variableNameArb: fc.Arbitrary<string> = baseIdentifierArb.map(
    (name: string) => `$${name}`
);

const stringCharArb: fc.Arbitrary<string> = fc.constantFrom<string>(
    ...letters,
    ...lettersUpper,
    ...digits,
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
    .map((chars: string[]) => {
        const content = chars.join("");
        return `'${content.replace(/'/g, "''")}'`;
    });

const doubleQuotedStringArb: fc.Arbitrary<string> = fc
    .array(stringCharArb, { maxLength: 18 })
    .map((chars: string[]) => `"${chars.join("")}"`);

const hereStringLiteralArb: fc.Arbitrary<string> = fc
    .array(stringCharArb, { minLength: 3, maxLength: 40 })
    .map((chars: string[]) => `@"\n${chars.join("")}\n"@`);

const numberLiteralArb: fc.Arbitrary<string> = fc
    .integer({ min: -999, max: 999 })
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
    .map((elements) =>
        elements.length === 0
            ? "@()"
            : `@(${elements.join(elements.length > 1 ? ", " : "")})`
    );

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
        ]: [
            string,
            string,
        ]) => ({ key, value })
    );

const formatHashtableEntry = ({ key, value }: HashtableEntry): string => {
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
    .map((entries: HashtableEntry[]) => {
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
    .array(stringCharArb, { minLength: 3, maxLength: 40 })
    .map((chars: string[]) => `# ${chars.join("")}`);

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
        ]: [
            string,
            string[],
            (
                | string
                | undefined
            ),
        ]) => {
            const pieces = [cmdlet];
            if (args.length > 0) {
                pieces.push(args.join(" "));
            }
            if (predicate) {
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
        ]: [
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
        fc.array(pipelineStageArb, { minLength: 1, maxLength: 3 })
    )
    .map(
        ([
            input,
            stages,
        ]: [
            string,
            string[],
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
        ]: [
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
            ]: [
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
        ]: [
            string,
            string,
        ]) => `${type} ${variable}`
    );

const lineEndingArb: fc.Arbitrary<string> = fc.constantFrom("\n", "\r\n");

type LetrecShape = {
    block: string;
    statement: string;
    nonEmptyStatement: string;
    script: string;
    structuredScript: string;
};

const arbitraries = fc.letrec<LetrecShape>((tie) => {
    const block: fc.Arbitrary<string> = fc
        .array(tie("statement"), { minLength: 1, maxLength: 6 })
        .filter((statements) =>
            statements.some((statement) => statement.trim().length > 0)
        )
        .map((statements) => statements.join("\n"));

    const elseIfClausesArb: fc.Arbitrary<Array<[string, string]>> = fc.array(
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
            thenBody: tie("block"),
            elseifClauses: elseIfClausesArb,
            elseBody: elseBodyArb,
        })
        .map(({ condition, thenBody, elseifClauses, elseBody }) => {
            const segments: string[] = [
                `if (${condition}) {\n${indent(thenBody)}\n}`,
            ];
            for (const [elseifCondition, elseifBody] of elseifClauses) {
                segments.push(
                    `elseif (${elseifCondition}) {\n${indent(elseifBody)}\n}`
                );
            }
            if (elseBody) {
                segments.push(`else {\n${indent(elseBody)}\n}`);
            }
            return segments.join("\n");
        });

    const paramBlockArb: fc.Arbitrary<string | undefined> = fc.option(
        fc
            .array(parameterDeclarationArb, { minLength: 1, maxLength: 3 })
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
                minLength: 0,
                maxLength: 3,
            }
        )
        .chain((sections) =>
            fc
                .array(tie("block"), {
                    minLength: sections.length,
                    maxLength: sections.length,
                })
                .map((bodies) =>
                    sections.map(
                        (section, index) =>
                            `${section} {\n${indent(bodies[index])}\n}`
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
            verb: functionVerbArb,
            name: capitalizedIdentifierArb,
            paramBlock: paramBlockArb,
            body: tie("block"),
            sections: functionSectionsArb,
        })
        .map(({ verb, name, paramBlock, body, sections }) => {
            const innerSegments: string[] = [];
            if (paramBlock) {
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
            tryBody: tie("block"),
            catchType: catchTypeArb,
            catchBody: tie("block"),
            finallyBody: fc.option(tie("block"), { nil: undefined }),
        })
        .map(({ tryBody, catchType, catchBody, finallyBody }) => {
            const clauses = [`try {\n${indent(tryBody)}\n}`];
            const catchHeader = catchType ? `catch ${catchType}` : "catch";
            clauses.push(`${catchHeader} {\n${indent(catchBody)}\n}`);
            if (finallyBody) {
                clauses.push(`finally {\n${indent(finallyBody)}\n}`);
            }
            return clauses.join("\n");
        });

    const foreachStatementArb: fc.Arbitrary<string> = fc
        .record({
            item: variableNameArb,
            source: fc.oneof(arrayLiteralArb, variableReferenceArb),
            body: tie("block"),
        })
        .map(
            ({ item, source, body }) =>
                `foreach (${item} in ${source}) {\n${indent(body)}\n}`
        );

    const whileStatementArb: fc.Arbitrary<string> = fc
        .record({
            condition: conditionArb,
            body: tie("block"),
        })
        .map(
            ({ condition, body }) =>
                `while (${condition}) {\n${indent(body)}\n}`
        );

    const doWhileStatementArb: fc.Arbitrary<string> = fc
        .record({
            condition: conditionArb,
            body: tie("block"),
        })
        .map(
            ({ condition, body }) =>
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
                    newline === "\n" ? joined : joined.replace(/\n/g, newline);
                return trailing ? `${normalised}${newline}` : normalised;
            }
        );

    const structuredScriptArb: fc.Arbitrary<string> = scriptArb.filter(
        (script) => script.trim().length > 0
    );

    return {
        block,
        statement: statementArb,
        nonEmptyStatement: nonEmptyStatementArb,
        script: scriptArb,
        structuredScript: structuredScriptArb,
    };
});

export const scriptArbitrary: fc.Arbitrary<string> = arbitraries.script;
export const structuredScriptArbitrary: fc.Arbitrary<string> =
    arbitraries.structuredScript;
