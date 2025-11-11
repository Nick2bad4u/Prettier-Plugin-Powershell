# Fixed version of weird-all-2.ps1 with valid syntax
# Combining all weird elements into one giant mess, but now valid

# Section 1: Ultra weird variables with all sorts of crap
$normal = 'hello world'; ${my super weird var with spaces and stuff} = 'spaces galore'; ${😀😂🤣} = 'multiple emojis'; ${var-with-lots-of-dashes-and-more} = 'dashed out'; $ñáéíóú = 'spanish accents'; ${123start456} = 'numstart'; ${var`with`many`backticks`everywhere} = 'escaped like crazy'; ${special!@#$%^&*()} = 'punctuation overload'; ${unicode_çüöß} = 'more unicode'; ${very_long_variable_name_that_goes_on_and_on_and_on_until_you_think_it_wont_stop_but_it_does_eventually} = 'long name'

# Section 2: Even weirder strings - multiline, escaped, nested, huge
$simple = 'simple string'; $quoted = "double quotes with 'singles' inside"; $here = @"
Here-string with multiple lines
And embedded "quotes" and 'single quotes'
Plus some tabs`tatabbed content
And newlines`nEverywhere
"@; $escaped = "Line1`nLine2`tTabbed`rCarriage`0Null`aAlert"; $unicode = 'Café résumé naïve 上海'; $emoji = '😀😁😂🤣😃😄😅😆😉😊😋😎😍😘🥰😗😙😚🙂🤗🤩🤔🤨😐😑😶🙄😏😣😥😮🤐😯😪😫😴😌😛😜😝🤤😒😓😔😕🙃🤑😲🙁😞😟😤😢😭😦😧😨😩🤯😬😰😱🥵🥶😳🤪😵😵‍💫🤤🥴😵‍💫'; $special = "`t`n`r`0`a`b`f`v"; $long = ('abcdefghijklmnopqrstuvwxyz' * 100); $nested = "Var is $normal, and here is ${my super weird var with spaces and stuff}, plus $emoji"; $multiline_array_string = @"
First line
Second line with $normal
Third line with ${😀😂🤣}
"@

# Section 3: Weird functions galore - names, params, logic
function Normal-Func { param($x, $y = 10) return ($x * $y) }; function func-with-many-dashes-and-even-more { param([string]$input) "Dashed func with $input" }; function func_with_underscores_and_more { "Underscore func with $($args -join ' ')" }; function func123withnumbers { param([int]$num) $num + 123 }; ${function 😀 with spaces} = { param($a) "Emoji func with $a" }; function Weird-Params { param([string]$param1 = 'default', [int]$param2, [switch]$flag, [array]$list, [hashtable]$hash) "P1:$param1 P2:$param2 F:$flag List:$($list -join ',') Hash:$($hash.Keys -join ';')" }; function Nested-Func { function Inner { 'Inner called' }; Inner; 'Outer called' }; function Recursive-Func { param($n) if ($n -le 0) { return 0 } else { return $n + (Recursive-Func ($n - 1)) } }; ${complex function with lots of stuff} = { param($x) try { $x / 0 } catch { "Caught division by zero: $_" } finally { 'Finally done' } }

# Section 4: Weird syntax overload - conditionals, loops, pipelines, all mixed
if ($true) { Write-Host 'True block' } elseif ($false) { Write-Host 'False block' } else { Write-Host 'Else block' }; foreach ($i in 1..10) { if ($i % 2 -eq 0) { Write-Host "Even: $i" } else { Write-Host "Odd: $i" } }; switch ('test') { 'test' { 'Match test' } 'other' { 'Match other' } default { 'Default' } }; 1..20 | Where-Object { $_ -gt 10 -and $_ % 3 -eq 0 } | ForEach-Object { $_ * 2 } | Sort-Object -Descending; try { throw 'Custom error' } catch [System.Exception] { "Caught exception: $($_.Exception.Message)" } finally { Write-Host 'Finally executed' }; $a, $b, $c, $d = 1, 2, 3, 4; $e = $f = $g = $h = 'same value'; $scriptblock = { param($x, $y) $x + $y; Write-Host 'Inside scriptblock' }; & $scriptblock 5 10; if ('hello world' -match 'world') { 'Regex match!' }; do { $counter = 0; $counter++ } while ($counter -lt 5); while ($true) { break }; for ($i = 0; $i -lt 5; $i++) { Write-Host "For loop: $i" }

# Section 5: Comments and more weirdness interspersed
# Comment with emojis: 😀 😂 🤣 and special chars: !@#$%^&*()
# Another comment: 'quotes' "double" `backticks`
# Long comment with unicode: çüöß 上海 北京
$array = @(
    'line1',
    "line2 with $normal",
    "line3 with ${😀}",
    'line4 very long ' + ('x' * 200)
); $hashtable = @{
    'normal_key'                                                     = 1
    ${weird key with spaces}                                         = 2
    123                                                              = 3
    'key-with-dashes'                                                = 4
    ${emoji_key 😀}                                                  = 5
    'long_key_that_goes_on_forever_and_ever_and_ever_until_it_stops' = 'long value'
}; $nested_hash = @{
    inner = @{
        deeper = @{
            value = 'nested deep'
        }
    }
}

# Section 6: Calls and outputs - everything executed in a mess
Write-Host (Normal-Func 5 3); func-with-many-dashes-and-even-more 'input'; func_with_underscores_and_more 'arg1' 'arg2'; func123withnumbers 100; & ${function 😀 with spaces} 'test'; Weird-Params -param1 'custom' -param2 42 -flag -list @(1, 2, 3) -hash @{a = 1; b = 2 }; Nested-Func; Recursive-Func 5; & ${complex function with lots of stuff} 10; Write-Host $simple $quoted $here $escaped $unicode $emoji $special $long $nested $multiline_array_string; Write-Host "Array: $($array -join ' | ')"; Write-Host "Hashtable: $($hashtable | ConvertTo-Json -Compress)"; Write-Host "Nested: $($nested_hash.inner.deeper.value)"; Write-Host 'Script done - if you parsed this, congrats!'
