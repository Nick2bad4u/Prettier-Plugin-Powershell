param(
    [Parameter(Mandatory = $false)]
    [switch]
    $StreamMode
)

$ErrorActionPreference = 'Stop'

function Test-PowerShellScript {
    param(
        [string] $Content,
        [string] $Identifier
    )

    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseInput(
        $Content,
        [ref] $tokens,
        [ref] $errors
    )
        | Out-Null

    if ($errors.Count -gt 0) {
        $messages = $errors
            | ForEach-Object {
                $_.ToString()
            }
        $joined = [string]::Join( [Environment]::NewLine, $messages )
        return @{
            Success = $false
            Identifier = $Identifier
            Error = "PowerShellParserError ($Identifier)`n$joined"
        }
    }

    return @{ Success = $true; Identifier = $Identifier }
}

if ($StreamMode) {
    # Stream mode: continuously read length-prefixed messages
    $utf8 = [System.Text.Encoding]::UTF8
    $stdin = [Console]::OpenStandardInput()
    $stdout = [Console]::OpenStandardOutput()

    # Read-Exact: reliably fills a buffer of exactly $Count bytes.
    # .NET Stream.Read() may return fewer bytes than requested on a single call
    # (especially on Linux/macOS where underlying reads are POSIX-level), so
    # we loop until the full buffer is filled or EOF is reached.
    function Read-Exact {
        param(
            [System.IO.Stream] $Stream,
            [int] $Count
        )
        $buffer = New-Object byte[] $Count
        $offset = 0
        while ($offset -lt $Count) {
            $read = $Stream.Read($buffer, $offset, $Count - $offset)
            if ($read -eq 0) {
                return $null  # EOF / closed stream
            }
            $offset += $read
        }
        return , $buffer
    }

    try {
        while ($true) {
            # Read 4-byte length prefix
            $lengthBytes = Read-Exact -Stream $stdin -Count 4
            if ($null -eq $lengthBytes) {
                break
            }

            $messageLength = [BitConverter]::ToInt32( $lengthBytes, 0 )
            if ($messageLength -le 0 -or $messageLength -gt 100MB) {
                Write-Error "Invalid message length: $messageLength"
                exit 11
            }

            # Read identifier length (4 bytes)
            $idLengthBytes = Read-Exact -Stream $stdin -Count 4
            if ($null -eq $idLengthBytes) {
                Write-Error 'Unexpected EOF reading identifier length prefix'
                exit 12
            }

            $idLength = [BitConverter]::ToInt32( $idLengthBytes, 0 )
            if ($idLength -le 0 -or $idLength -gt 1KB) {
                Write-Error "Invalid identifier length: $idLength"
                exit 13
            }

            # Read identifier
            $idBytes = Read-Exact -Stream $stdin -Count $idLength
            if ($null -eq $idBytes) {
                Write-Error 'Unexpected EOF reading identifier'
                exit 14
            }
            $identifier = $utf8.GetString($idBytes)

            # Read script content
            $contentLength = $messageLength - $idLength - 4
            $contentBytes = Read-Exact -Stream $stdin -Count $contentLength
            if ($null -eq $contentBytes) {
                Write-Error 'Unexpected EOF reading script content'
                exit 15
            }
            $content = $utf8.GetString($contentBytes)

            # Validate script
            $result = Test-PowerShellScript -Content $content -Identifier $identifier

            # Send response
            if ($result.Success) {
                $responseBytes = $utf8.GetBytes("OK`n")
            }
            else {
                $responseBytes = $utf8.GetBytes("ERROR`n$($result.Error)`n")
            }

            # Write response length + response
            $responseLengthBytes = [BitConverter]::GetBytes(
                $responseBytes.Length
            )
            $stdout.Write( $responseLengthBytes, 0, 4 )
            $stdout.Write( $responseBytes, 0, $responseBytes.Length )
            $stdout.Flush()
        }
    }
    finally {
        $stdin.Dispose()
        $stdout.Dispose()
    }
}
else {
    # Legacy single-script mode (for backward compatibility)
    $identifier = $args[0]
    if (-not $identifier) {
        Write-Error 'Identifier is required in single-script mode'
        exit 1
    }

    try {
        $utf8 = [System.Text.Encoding]::UTF8
        $reader = [System.IO.StreamReader]::new(
            [Console]::OpenStandardInput(),
            $utf8,
            $false,
            8192,
            $true
        )
        try {
            $content = $reader.ReadToEnd()
        }
        finally {
            $reader.Dispose()
        }
    }
    catch {
        Write-Error (
            'Failed to read script content for {0}: {1}' -f $identifier,
            $_
        )
        exit 10
    }

    $result = Test-PowerShellScript -Content $content -Identifier $identifier

    if (-not $result.Success) {
        Write-Error $result.Error
        exit 20
    }

    exit 0
}
