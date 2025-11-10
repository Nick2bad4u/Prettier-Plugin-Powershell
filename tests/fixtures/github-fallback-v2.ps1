<#
    Deterministic PowerShell script used as an offline fallback sample
    when GitHub lookups are disabled. The script stays within the
    formatter's supported grammar while still exercising functions,
    hashtables, advanced parameters, pipelines, splatting, and
    try/catch blocks.
#>

param(
    [Parameter(Mandatory = $false)]
    [string]
    $Root = (Get-Location).Path,

    [Parameter(Mandatory = $false)]
    [switch]
    $IncludeHidden,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 50)]
    [int]
    $Maximum = 12
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

    $arguments = @{
        LiteralPath = $Path
        File        = $true
        Recurse     = $true
        Force       = $Hidden.IsPresent
        ErrorAction = 'Stop'
    }

    Get-ChildItem @arguments |
        Select-Object FullName, Length, LastWriteTimeUtc, Attributes
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
        $Top = 10
    )

    begin {
        $buffer = [System.Collections.Generic.List[object]]::new()
    }

    process {
        $null = $buffer.Add($InputObject)
    }

    end {
        $buffer
        | Sort-Object Length -Descending
        | Select-Object -First $Top
        | ForEach-Object {
            $size = '{0,12:N0}' -f $_.Length
            '{0,-60} {1} {2}' -f $_.Path, $size, $_.Modified.ToString('s')
        }
    }
}

try {
    Write-Verbose "Gathering fallback inventory from '$Root'"

    $records = Get-FallbackInventory -Path $Root -Hidden:$IncludeHidden |
        ConvertTo-FallbackRecord |
            Where-Object { $_.Length -gt 128 }

    $summary = $records |
        Group-Object Folder |
            Sort-Object Count -Descending

    $report = $records |
        Format-FallbackReport -Top:$Maximum

    foreach ($group in $summary | Select-Object -First 5) {
        $total = ($group.Group | Measure-Object Length -Sum).Sum
        Write-Output (
            '{0,-40} {1,5} files {2,12:N0} bytes' -f $group.Name, $group.Count, $total
        )
    }

    @'
==== Detailed Report ({0} entries) ====
{1}
'@ -f $report.Count, ($report -join [Environment]::NewLine) |
        Write-Output
}
catch {
    Write-Error "Fallback report failed: $($_.Exception.Message)"
}
finally {
    $status = [ordered]@{
        Timestamp = (Get-Date).ToString('o')
        Host      = $env:COMPUTERNAME
        Hidden    = $IncludeHidden.IsPresent
    }

    $json = $status | ConvertTo-Json -Depth 4
    Write-Verbose "Fallback status: $json"
}
