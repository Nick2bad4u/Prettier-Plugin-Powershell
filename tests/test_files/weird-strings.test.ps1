# Test file with weird strings and formatting

# Normal string
$simple = 'simple string'

# String with quotes
$quoted = 'single quotes'
$dquoted = 'double quotes'

# Here-string
$here = @'
This is a here-string
With multiple lines
And "quotes" inside
'@

# String with escapes
$escaped = "Line1`nLine2`tTabbed"

# String with Unicode
$unicode = 'Café résumé naïve'

# String with emoji
$emoji = '😀 😁 😂'

# Multiline with backslash (invalid in PS, but test)
# $bad = "line1 \
# line2"  # PS doesn't support line continuation like this

# String with special chars
$special = "Special: `t `n `r `0 `a"

# Very long string
$long = ('a' * 1000)

# String with embedded variables
$nested = "Var is $normal"

# Write output
Write-Host $simple
Write-Host $quoted
Write-Host $dquoted
Write-Host $here
Write-Host $escaped
Write-Host $unicode
Write-Host $emoji
Write-Host $special
Write-Host $nested
