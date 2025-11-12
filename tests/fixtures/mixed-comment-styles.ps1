# Mixed comment styles including block comments and nested structures.
<#
    .SYNOPSIS
    Outer block comment

    .DESCRIPTION
    Contains nested blocks and line comments.
#>
function Test-Comments {
    <#
        Inner block comment
    #>
    param(
        # Inline parameter comment
        [string] $Value
    )

    # Single line comment
    $result = @{
        # Hashtable comment
        Key1 = "Value1" # trailing comment
        <#
            Block comment in hashtable
        #>
        Key2 = "Value2"
    }

    <# Inline block #> Write-Output $result

    # Comment before return
    return $result # Trailing return comment
}

# Final comment
