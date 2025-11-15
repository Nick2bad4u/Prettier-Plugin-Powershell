function Invoke-LockStep {
    param(
        [Parameter(Mandatory)] [object] $SyncRoot,
        [Parameter(Mandatory)] [scriptblock] $Action
    )

    $lockTaken = $false

    try {
        [System.Threading.Monitor]::Enter(
            $SyncRoot
        )
        & $Action
    }
    finally {
        if ($lockTaken) {
            [System.Threading.Monitor]::exit(
                $SyncRoot
            )
        }
    }
}
