function Test-StaticInPipelines {
    [CmdletBinding()]
    param(
        [Parameter()][string[]]$Names
    )

    $results = $Names |
        ForEach-Object {
            [System.Console]::WriteLine ( $_ )
            [System.Guid]::NewGuid().ToString()
        } |
        Where-Object { $_ -ne $null }

    # static call in assignment plus chained property
    $envSeparator =
        [System.IO.Path]::PathSeparator
    $joined = [System.String]::Join( $envSeparator, $results )

    return [System.String]::Format(
        "Joined ({0}): {1}",
        $results.Count,
        $joined
    )
}
