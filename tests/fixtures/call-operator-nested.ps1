# Exercises call operator pipelines and nested subexpressions.
$greeter = {
    param($Name)
    "Hello, $Name!"
}

$commands = @{
    Greeter = $greeter
    Timestamp = { & (Get-Command Get-Date) -Format o }
}

& $commands.Greeter -Name "World"

& (Get-Command Write-Output) (& $commands.Greeter -Name "Nested call")

$splat = @{
    ScriptBlock   = { param($Value) & (Get-Command Write-Host) $Value }
    ArgumentList  = @("Value1", "Value2")
}

& $splat.ScriptBlock -Value "Inline"

& (& { Get-Command Write-Output }) @("Pipelines", "Still", "Work")
