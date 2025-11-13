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
  ) | Out-Null

  if ($errors.Count -gt 0) {
    $messages = $errors | ForEach-Object { $_.ToString() }
    $joined = [string]::Join([Environment]::NewLine, $messages)
    return @{
      Success = $false
      Identifier = $Identifier
      Error = "PowerShellParserError ($Identifier)`n$joined"
    }
  }

  return @{
    Success = $true
    Identifier = $Identifier
  }
}

if ($StreamMode) {
  # Stream mode: continuously read length-prefixed messages
  $utf8 = [System.Text.Encoding]::UTF8
  $stdin = [Console]::OpenStandardInput()
  $stdout = [Console]::OpenStandardOutput()

  try {
    while ($true) {
      # Read 4-byte length prefix
      $lengthBytes = New-Object byte[] 4
      $bytesRead = $stdin.Read($lengthBytes, 0, 4)
      if ($bytesRead -eq 0) { break }
      if ($bytesRead -ne 4) {
        Write-Error "Invalid length prefix"
        exit 10
      }

      $messageLength = [BitConverter]::ToInt32($lengthBytes, 0)
      if ($messageLength -le 0 -or $messageLength -gt 100MB) {
        Write-Error "Invalid message length: $messageLength"
        exit 11
      }

      # Read identifier length (4 bytes)
      $idLengthBytes = New-Object byte[] 4
      $bytesRead = $stdin.Read($idLengthBytes, 0, 4)
      if ($bytesRead -ne 4) {
        Write-Error "Invalid identifier length prefix"
        exit 12
      }

      $idLength = [BitConverter]::ToInt32($idLengthBytes, 0)
      if ($idLength -le 0 -or $idLength -gt 1KB) {
        Write-Error "Invalid identifier length: $idLength"
        exit 13
      }

      # Read identifier
      $idBytes = New-Object byte[] $idLength
      $bytesRead = $stdin.Read($idBytes, 0, $idLength)
      if ($bytesRead -ne $idLength) {
        Write-Error "Failed to read identifier"
        exit 14
      }
      $identifier = $utf8.GetString($idBytes)

      # Read script content
      $contentLength = $messageLength - $idLength - 4
      $contentBytes = New-Object byte[] $contentLength
      $bytesRead = $stdin.Read($contentBytes, 0, $contentLength)
      if ($bytesRead -ne $contentLength) {
        Write-Error "Failed to read script content"
        exit 15
      }
      $content = $utf8.GetString($contentBytes)

      # Validate script
      $result = Test-PowerShellScript -Content $content -Identifier $identifier

      # Send response
      if ($result.Success) {
        $responseBytes = $utf8.GetBytes("OK`n")
      } else {
        $responseBytes = $utf8.GetBytes("ERROR`n$($result.Error)`n")
      }

      # Write response length + response
      $responseLengthBytes = [BitConverter]::GetBytes($responseBytes.Length)
      $stdout.Write($responseLengthBytes, 0, 4)
      $stdout.Write($responseBytes, 0, $responseBytes.Length)
      $stdout.Flush()
    }
  }
  finally {
    $stdin.Dispose()
    $stdout.Dispose()
  }
} else {
  # Legacy single-script mode (for backward compatibility)
  $identifier = $args[0]
  if (-not $identifier) {
    Write-Error "Identifier is required in single-script mode"
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
