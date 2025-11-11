# Test file with weird function names and calls

# Normal function
function Normal-Func {
    param($x)
    return $x * 2
}

# Function with braces (invalid, but let's see)
# function ${weird func} {  # Commented out as invalid
# }

# Function with dashes
function func-with-dashes {
    'Dashed func'
}

# Function with underscores
function func_with_underscores {
    'Underscore func'
}

# Function with numbers
function func123 {
    'Numbered func'
}

# Function with emoji (braced)
${function 😀} = {
    'Emoji func'
}

# Call functions
Normal-Func 5
func-with-dashes
func_with_underscores
func123
& ${function 😀}

# Function with special params
function Weird-Params {
    param(
        [string]$param1 = 'default',
        [int]$param2,
        [switch]$flag
    )
    "Param1: $param1, Param2: $param2, Flag: $flag"
}

Weird-Params -param2 10 -flag
