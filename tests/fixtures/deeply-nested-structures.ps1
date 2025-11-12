# Deeply nested structures with mixed delimiters.
$config = @{
    Level1 = @{
        Level2 = @{
            Level3 = @(
                @{
                    Items = @(
                        @{ Name = "A"; Value = 1 },
                        @{ Name = "B"; Value = 2 }
                    )
                    Meta = @{
                        Tags = @("tag1", "tag2", "tag3")
                        Flags = @{
                            EnableA = $true
                            EnableB = $false
                        }
                    }
                }
            )
        }
    }
}

Write-Output $config.Level1.Level2.Level3[0].Meta.Flags.EnableA
