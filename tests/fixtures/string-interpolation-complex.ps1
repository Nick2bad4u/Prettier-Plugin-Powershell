# String interpolation edge cases with subexpressions and escape sequences.
$name = "World"
$count = 42

$simple = "Hello, $name!"
$escaped = "Value: `$count"
$subexpr = "Result: $($count * 2)"
$nested = "Nested: $("Inner: $($name.ToUpper())")"

$multiline = @"
Line 1: $name
Line 2: $($count + 1)
Line 3: $(
    $temp = $count * 2
    "Value is $temp"
)
"@

$literalMulti = @'
No interpolation: $name
Literal: $count
'@

$combined = "$name says: $($literalMulti.Split([Environment]::NewLine)[0])"

Write-Output $combined
