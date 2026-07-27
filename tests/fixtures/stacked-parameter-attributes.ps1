function Handle-CommandResponse(
    [Parameter(Mandatory)]
    [ValidateSet("Set-Temp", "Remove-Temp")]
    [string]$CommandName,
    [object]$response) {
    if ($null -eq $response) { return }
}

function global:Invoke-WithCallback(
    [Parameter(Mandatory)]
    [scriptblock]$Action = { Get-Process },
    # Number of times to invoke the callback.
    [ValidateRange(1, 10)]
    [int]$Count = 1) {
    1..$Count | ForEach-Object { & $Action }
}

class ParameterFixture {
    [void] Invoke(
        [string]
        $Name,
        [int]$Count) {
        Write-Output "$Name $Count"
    }
}
