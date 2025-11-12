# Unicode identifiers and mixing of scripts.
function Invoke-Δelta {
    param(
        [string] $Μessage,
        [int] $値 = １
    )

    $π = { param($θ) $θ * 3.14 }
    $Ζ𝟘 = & $π ($値 + 1)

    if ($Μessage.Length -gt 0) {
        Write-Output "$Μessage -> $Ζ𝟘"
    }
}

Invoke-Δelta -Μessage "Hello" -値 3
