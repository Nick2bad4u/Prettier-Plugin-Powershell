# Fixed version of weird-extra2.ps1 with valid syntax
# Regex, operators, edge cases

# Complex regex patterns
$pattern1 = '^[\w\d\s]*$'  # Alphanumeric with spaces
$pattern2 = '(?i)(hello|world)\s+(\w+)'  # Case insensitive with groups
$pattern3 = '[^\x00-\x7F]+'  # Non-ASCII chars

# Test strings
$testString1 = 'Hello World PowerShell'
$testString2 = 'Café résumé naïve 上海'
$testString3 = '😀😁😂'

# Regex operations
if ($testString1 -match $pattern1) { "Match1: $($matches[0])" }
if ($testString2 -match $pattern2) { "Match2: Group1: $($matches[1]), Group2: $($matches[2])" }
$replaced = $testString3 -replace $pattern3, '[emoji]'

# Weird operators
$result1 = 5 -band 3  # Bitwise and
$result2 = 'string' -like '*str*'  # Like operator
$result3 = @(1, 2, 3) -contains 2  # Contains
$result4 = $null -eq $null  # Null comparison
$result5 = 10 -gt 5 -and $true  # Logical and

# Edge case variables
${empty} = 'empty braces'  # Fixed: added 'empty' inside
${ } = 'space only'  # Space in braces
${`t} = 'tab char'  # Tab in name

# Multiline with weird indentation
if ($true) {
    foreach ($item in 1..3) {
        switch ($item) {
            1 { 'One' }
            2 { 'Two' }
            default { 'Other' }
        }
    }
}

# Output everything
Write-Host "Regex replaced: $replaced"
Write-Host "Results: $result1, $result2, $result3, $result4, $result5"
Write-Host "Edge vars: ${empty}, ${ }, ${`t}"
