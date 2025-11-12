# Error handling with multiple try/catch/finally blocks and nested exceptions.
function Test-ErrorHandling {
    try {
        Write-Output "Outer try"

        try {
            Write-Output "Inner try"
            throw "Inner exception"
        }
        catch [System.InvalidOperationException] {
            Write-Warning "Caught InvalidOperationException"
        }
        catch {
            Write-Error "Inner catch-all"
            throw
        }
        finally {
            Write-Verbose "Inner finally"
        }

        throw "Outer exception"
    }
    catch [System.ArgumentException] {
        Write-Warning "Argument exception: $_"
    }
    catch [System.IO.IOException] {
        Write-Warning "IO exception: $_"
    }
    catch {
        Write-Error "Outer catch-all: $_"
    }
    finally {
        Write-Verbose "Outer finally"
    }
}

Test-ErrorHandling
