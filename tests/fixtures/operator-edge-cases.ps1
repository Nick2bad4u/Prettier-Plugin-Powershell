# Edge cases for operators: range, ternary-like, increment/decrement.
$range = 1..10
$reversed = 10..1

$index = 0
$value = $range[$index++]
$next = $range[++$index]
$previous = $range[$index--]

$condition = $true
$result = if ($condition) { "TrueValue" } else { "FalseValue" }

$combined = ($range | Where-Object { $_ -gt 5 }) -join ","

$splatted = @{
    First  = 1
    Second = 2
}

& {
    param($First, $Second)
    $First + $Second
} @splatted

$null -eq $value ? "IsNull" : "NotNull"
