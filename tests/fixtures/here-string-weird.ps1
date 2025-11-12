# Mixed indentation and here-strings with nested script blocks.
$script = @"
Line one
    Line two
"@

& {
    param($Input)
    @"
$Input
"@ | Write-Output
} $script

$literal = @'
{
    "Nested": {
        "Value": "Spacing"
    }
}
'@

Write-Output $literal.Trim()
