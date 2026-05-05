---
name: "Markdown-Guidelines"
description: "Documentation and content creation standards"
applyTo: "**/*.md"
---

## Markdown Content Rules

1. **Headings**: Use appropriate heading levels (H2, H3, etc.) to structure your content.
2. **Code Blocks**: Use fenced code blocks for code snippets. Specify the language for syntax highlighting.
3. **Links**: Use proper markdown syntax for links. Ensure that links are valid and accessible.
4. **Images**: Use proper markdown syntax for images. Include alt text for accessibility.
5. **Tables**: Use markdown tables for tabular data. Ensure proper formatting and alignment.
6. **Whitespace**: Use appropriate whitespace to separate sections and improve readability.

## Formatting and Structure

Follow these guidelines for formatting and structuring your markdown content:

-   **Headings**: Use `##` for H2 and `###` for H3. Ensure that headings are used in a hierarchical manner.
-   **Lists**: Use `-` for bullet points and `1.` for numbered lists. Indent nested lists with two spaces.
-   **Code Blocks**: Use triple backticks (```) to create fenced code blocks. Specify the language after the opening backticks for syntax highlighting (e.g., ```ts for TypeScript, ```bash for shell examples).
-   **Links**: Use `[link text](https://example.com)` for links. Ensure that the link text is descriptive and the URL is valid.
-   **Images**: Use `![alt text](https://example.com/picture.png)` for images. Include a brief description of the image in the alt text.
-   **Tables**: Use `|` to create tables. Ensure that columns are properly aligned and headers are included.
-   **Whitespace**: Use blank lines to separate sections and improve readability. Avoid excessive whitespace.
-   **Tooling alignment**: Use the repository's actual Markdown tooling (for example Remark, markdownlint, or docs link-check commands if present). Run the local Markdown lint, fix, and link-check scripts that exist instead of assuming template-specific script names.
