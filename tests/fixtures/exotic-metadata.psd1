@{
    # Comment with non-breaking spaces embedded.
    RootModule      = "ExoticModule.psm1"
    ModuleVersion   = "0.1.0"
    GUID            = "01234567-89ab-cdef-0123-456789abcdef"
    Author          = "Formatter"
    CompanyName     = "Invisible Co"
    AliasesToExport = @(
        "Invoke-✨"
        "Measure-⁠Hidden"
    )
    PrivateData     = @{
        Notes = @"
            Multiline note with NBSP and ZWSP​ embedded.
"@
        Tags = @(
            "ZeroWidth​"
            "CallOperator"
            "Unicode⁠Tag"
        )
        Metadata = @{
            Comment = "Contains ; semicolons ; but remains data"
            Spaces  = "Line`nBreak"
        }
    }
    # Trailing comment with word joiner⁠here
}
