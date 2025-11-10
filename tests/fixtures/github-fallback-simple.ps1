<#
    Simplified fallback PowerShell script that remains within the
    formatter's supported feature set. It still touches advanced
    parameters, pipelines, hashtables, loops, try/catch, and string
    interpolation so that property tests can stress realistic input.
#>

param(
    [Parameter(Mandatory = $false)]
    [string]
    $Root = (Get-Location).Path,

    [Parameter(Mandatory = $false)]
    [switch]
    $IncludeHidden,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 40)]
    [int]
    $Maximum = 10
)

function Get-FallbackInventory {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]
        $Path,

        [Parameter(Mandatory = $false)]
        [switch]
        $Hidden
    )

    Get-ChildItem -LiteralPath $Path -File -Recurse -Force:$Hidden.IsPresent -ErrorAction Stop |
        Select-Object -Property FullName, Length, LastWriteTimeUtc, Attributes
}

function ConvertTo-FallbackRecord {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [pscustomobject]
        $InputObject
    )

    process {
        [PSCustomObject]@{
            Path     = $InputObject.FullName
            Length   = $InputObject.Length
            Modified = $InputObject.LastWriteTimeUtc
            Hidden   = $InputObject.Attributes.ToString().Contains('Hidden')
            Folder   = Split-Path -Path $InputObject.FullName -Parent
        }
    }
}

function Format-FallbackReport {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
        [pscustomobject]
        $InputObject,

        [Parameter(Mandatory = $false)]
        [int]
        $Top = 8
    )

    begin {
        $items = @()
    }

    process {
        $items += $InputObject
    }

    end {
        $items |
            Sort-Object -Property Length -Descending |
                Select-Object -First $Top |
                    ForEach-Object {
                        $size = '{0,12:N0}' -f $_.Length
                        '{0,-60} {1} {2}' -f $_.Path, $size, $_.Modified.ToString('s')
                    }
    }
}

try {
    Write-Verbose "Gathering fallback inventory from '$Root'"

    $records = Get-FallbackInventory -Path $Root -Hidden:$IncludeHidden |
        ConvertTo-FallbackRecord |
            Where-Object { $_.Length -gt 256 }

    $grouped = $records |
        Group-Object -Property Folder |
            Sort-Object -Property Count -Descending

    $topLines = $records |
        Format-FallbackReport -Top:$Maximum

    foreach ($group in $grouped | Select-Object -First 5) {
        $total = ($group.Group | Measure-Object -Property Length -Sum).Sum
        Write-Output (
            '{0,-40} {1,5} files {2,12:N0} bytes' -f $group.Name, $group.Count, $total
        )
    }

    @'
==== Detailed Report ({0} entries) ====
{1}
'@ -f $topLines.Count, ($topLines -join [Environment]::NewLine) |
        Write-Output
}
catch {
    Write-Error "Fallback report failed: $($_.Exception.Message)"
}
finally {
    $status = @{
        Timestamp = (Get-Date).ToString('o')
        Host      = $env:COMPUTERNAME
        Hidden    = $IncludeHidden.IsPresent
    }

    Write-Verbose "Fallback status: $(ConvertTo-Json $status -Depth 4)"
}
