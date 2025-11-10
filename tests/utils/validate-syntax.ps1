param(
    [Parameter(Mandatory = $true)]
    [string]
    $Identifier
)

$ErrorActionPreference = 'Stop'

try {
    $utf8 = [System.Text.Encoding]::UTF8
    $reader = [System.IO.StreamReader]::new([Console]::OpenStandardInput(), $utf8, $false, 8192, $true)
    try {
        $content = $reader.ReadToEnd()
    }
    finally {
        $reader.Dispose()
    }
}
catch {
    Write-Error ('Failed to read script content for {0}: {1}' -f $Identifier, $_)
    exit 10
}

$tokens = $null
$errors = $null
[System.Management.Automation.Language.Parser]::ParseInput($content, [ref]$tokens, [ref]$errors) | Out-Null

if ($errors.Count -gt 0) {
    $messages = $errors | ForEach-Object { $_.ToString() }
    $joined = [string]::Join([Environment]::NewLine, $messages)
    Write-Error "PowerShellParserError ($Identifier)`n$joined"
    exit 20
}

exit 0
