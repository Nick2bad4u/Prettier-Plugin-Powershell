# This script exercises right-to-left markers and zero-width characters.
# The following line includes a RIGHT-TO-LEFT MARK (‎) between words.
# English‎Arabic marker
# The next line includes a ZERO WIDTH SPACE (​) inside the word:
# zero​width

function Test-RtlAndZeroWidth {
    param(
        [string] $Text = "سلام‎World"  # Mixed Arabic/English with RLM between
    )

    $message = "Prefix -> $Text" # Non-breaking spaces (NBSP) around arrow

    Write-Output $message
}

Test-RtlAndZeroWidth
