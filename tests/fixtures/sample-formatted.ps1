function Get-Widget {
    param(
        [string] $Name,
        [int] $Count
    )

    $items = Get-Item
    | Where-Object {
        $_.Name -eq $Name
    }
    | Select-Object Name, Length
    $hash = @{ b = 2; a = 1 }
    $lines = @"
line1
 line2
"@
    return $items
}
