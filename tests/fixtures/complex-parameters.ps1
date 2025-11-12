# Parameter attributes with complex validation and transformation.
function Test-ComplexParams {
    [CmdletBinding(DefaultParameterSetName = "Default")]
    param(
        [Parameter(
            Mandatory = $true,
            Position = 0,
            ValueFromPipeline = $true,
            ValueFromPipelineByPropertyName = $true,
            ParameterSetName = "Default"
        )]
        [ValidateNotNullOrEmpty()]
        [ValidateScript({ $_.Length -gt 0 })]
        [Alias("Name", "ID")]
        [string]
        $Identifier,

        [Parameter(Mandatory = $false)]
        [ValidateRange(1, 100)]
        [ValidateSet("Low", "Medium", "High")]
        [AllowNull()]
        [AllowEmptyString()]
        [string]
        $Priority = "Medium",

        [Parameter(ParameterSetName = "Advanced")]
        [ValidatePattern("^[A-Z]{3}-\d{4}$")]
        [string]
        $Code
    )

    process {
        Write-Output "$Identifier : $Priority"
    }
}
