# Pipeline chains with call operators, redirects, and splatting.
$log = Join-Path $PSScriptRoot "pipeline.log"
Remove-Item -LiteralPath $log -ErrorAction SilentlyContinue

$writers = @(
    { param($Message) & (Get-Command Write-Output) $Message }
    { param($Message) & (Get-Command Write-Warning) $Message }
)

$processes = Get-Process | Where-Object { $_.Name -like "*powershell*" }

$processes `
    && & (Get-Command Write-Output) "Chained success" `
    || & (Get-Command Write-Warning) "Chained warning" `
    > $log 2>&1

$splat = @{
    Message = "Done"
}

& $writers[0] @splat | Out-String | Write-Verbose
