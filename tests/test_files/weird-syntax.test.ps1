# Test file with weird syntax that might confuse parsers

# Conditional with weird formatting
if ($true) { Write-Host 'True' } elseif ($false) { 'False' } else { 'Else' }

# Loop with odd indentation
foreach ($i in 1..3) {
    Write-Host $i
}

# Switch with cases
switch (1) {
    1 { 'One' }
    2 { 'Two' }
    default { 'Default' }
}

# Pipeline with weird ops
1..5 | Where-Object { $_ -gt 3 } | ForEach-Object { $_ * 2 }

# Try-catch with finally
try {
    throw 'Error'
}
catch {
    "Caught: $_"
}
finally {
    'Finally'
}

# Weird variable assignment
$a = $b = $c = 5
$d, $e = 1, 2

# Function with scriptblock
$sb = { param($x) $x + 1 }
& $sb 10

# Regex match
if ('test' -match 't.st') { 'Match' }

# Weird comment
# This is a comment with special chars: 😀 # " ' `

# Multiline string in array
$array = @(
    'line1',
    'line2'
)

# Hash table with weird keys
$ht = @{
    'normal'     = 1
    ${weird key} = 2
    123          = 3
}

# Output
Write-Host "Array: $($array -join ', ')"
Write-Host "Hash: $($ht | Out-String)"
