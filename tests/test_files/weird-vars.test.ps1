# Test file with weird variable names and characters

# Normal var
$normal = 'hello'

# Var with underscore
$under_score = 42

# Var with braces and spaces
${my weird var} = 'spaces in name'

# Var with numbers
$var123 = 123

# Var with emoji in braces (supported)
${😀} = 'emoji var'

# Var with special chars in braces
${var-with-dashes} = 'dashes'

# Var with Unicode letters
$ñ = 'spanish n'

# Attempt naked emoji (should fail, but let's see)
# $😀 = "naked emoji"  # Commented out as invalid

# Var starting with number (invalid, but in braces ok)
${123start} = 'starts with num'

# Var with backticks (escape in name)
${var`with`backticks} = 'escaped'

# Output
Write-Host $normal
Write-Host ${my weird var}
Write-Host ${😀}
