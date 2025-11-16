function Use-StaticMembers {
    param(
        [Parameter(Mandatory)] [object] $SyncRoot,
        [Parameter()] [scriptblock] $Body
    )

    [System.Threading.Monitor]::Enter(
        $SyncRoot
    )

    $stopwatch =
    [System.Diagnostics.Stopwatch]::startnew()

    try {
        & $Body
        [System.Console]::WriteLine(
            "Inside critical section"
        )
    }
    finally {
        if ($stopwatch) {
            $stopwatch.Stop()
        }
        [System.Threading.Monitor]::EXIT(
            $SyncRoot
        )
    }
}
