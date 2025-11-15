function Test-StaticKeywordLikeMethods {
    [CmdletBinding()]
    param(
        [Parameter()][int]$Value
    )

    if ($Value -gt 0) {
        # Methods whose names look like PowerShell keywords
        [Foo.Bar]::Exit
        [Foo.Bar]::FOR( $Value )
        [Foo.Bar]::if( $Value )
        [Foo.Bar]::while
    }
}
