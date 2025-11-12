# Multiple BOMs and shebangs to stress initial parsing.
#!/usr/bin/env pwsh
#Requires -Version 5.1

param([string]$Message = "Default")

function Test-BOM {
    Write-Output $Message
}

Test-BOM
