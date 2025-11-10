<#
    Sample PowerShell script used as a deterministic fallback for the
    GitHub property-based tests. The script intentionally exercises a
    variety of PowerShell constructs: advanced functions, pipelines,
    hashtables, comment blocks, try/catch, classes, and data-driven
    configuration.
#>

using namespace System.IO

param(
    [Parameter(Mandatory = $false)]
    [string]
    $Root = (Get-Location).Path,

    [Parameter(Mandatory = $false)]
    [switch]
    $IncludeHidden
)

class FallbackReport {
    [string] $Path
    [long] $Length
    [datetime] $LastWriteTime
    [bool] $IsReadOnly

    FallbackReport([FileInfo] $Info) {
        $this.Path = $Info.FullName
        $this.Length = $Info.Length
        $this.LastWriteTime = $Info.LastWriteTimeUtc
        $this.IsReadOnly = $Info.IsReadOnly
    }

    [string] ToString() {
        return '{0} ({1} bytes)' -f $this.Path, $this.Length
    }
}

function Get-FallbackFiles {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [string]
        $TargetPath,

        [Parameter()]
        [switch]
        $Hidden
    )

    Write-Verbose "Enumerating files under $TargetPath"

    if (-not (Test-Path -LiteralPath $TargetPath)) {
        throw "Path '$TargetPath' does not exist."
    }

    $option = if ($Hidden) { 'Force' } else { '' }

    Get-ChildItem -LiteralPath $TargetPath -File -Recurse @{
        Force = $Hidden.IsPresent
    } | ForEach-Object {
        [FallbackReport]::new($_)
    }
}

function New-FallbackSummary {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [FallbackReport[]]
        $InputObject
    )

    $grouped = $InputObject |
        Group-Object { $_.Path.Split([IO.Path]::DirectorySeparatorChar)[0] }

    foreach ($group in $grouped) {
        $totalSize = ($group.Group | Measure-Object Length -Sum).Sum
        [PSCustomObject]@{
            Root       = $group.Name
            Count      = $group.Count
            TotalBytes = $totalSize
        }
    }
}

$configuration = @{
    Root    = $Root
    Hidden  = $IncludeHidden.IsPresent
    Maximum = 10
    Filters = @(
        { param($item) -not $item.IsReadOnly },
        { param($item) $item.Length -gt 32 }
    )
}

Write-Verbose "Using configuration: $(ConvertTo-Json $configuration -Depth 4)"

try {
    $reports = Get-FallbackFiles -TargetPath $configuration.Root -Hidden:$configuration.Hidden

    foreach ($filter in $configuration.Filters) {
        $reports = $reports | Where-Object { & $filter $_ }
    }

    $topReports = $reports | Sort-Object Length -Descending | Select-Object -First $configuration.Maximum

    if ($topReports.Count -eq 0) {
        Write-Warning 'No files matched the fallback configuration'
    }

    $summary = New-FallbackSummary -InputObject $topReports
    $summary | Sort-Object TotalBytes -Descending | ForEach-Object {
        Write-Output ('{0,-25} {1,5} files {2,10} bytes' -f $_.Root, $_.Count, $_.TotalBytes)
    }
}
catch {
    Write-Error "Failed to produce fallback report: $_"
}
finally {
    # Example of cleaning up transient state
    $null = 1..3 | ForEach-Object { "Cleanup iteration $_" } | Out-Null
}
