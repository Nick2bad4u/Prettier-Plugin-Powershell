# weird-symbols.ps1
# A PowerShell file filled with lots of unusual Unicode characters, emojis,
# arrows, math symbols, box-drawing, scripts, combining marks, and more.
# Save this file with UTF-8 encoding and open it in a Unicode-aware editor.
#
# NOTE: This file intentionally contains many exotic characters in comments,
# strings, variable names, here-strings, and regexes. It's meant for testing
# how editors, parsers, and tooling handle Unicode.

# Variables with Unicode names
$π = 'π — pi'
$Δ = 'Δ — Delta'
$变量 = "变量 — Chinese for 'variable'"
$ответ = "ответ — Russian for 'answer'"
${😺} = 'emoji variable: 😺 😸 😻'
${'var with spaces'} = 'a variable name with spaces (braced form)'

# Lots of emoji and symbol sets
$emoji = '😀 😃 😄 😁 😆 😅 😂 🤣 🙂 🙃 😉 😊 😇 😍 🥰 🤩 😎 🤖 🧪 🛸 👾 👩‍💻 🧑‍🔬'
$weird = 'Arrows: ← ↑ → ↓ ↔ ↕ ↖ ↗ ↘ ↙ ➜ ➝ ➞  •  …  ·  — — —  •• •'
$math = 'Math: ∑ ∏ ∫ √ ∞ ≈ ≠ ≤ ≥ ± ∂ ∇ ∈ ∪ ∩ ⊕ ⊗ ≡ ≈'
$currency = 'Currency: ₿ ₹ € £ ¥ ¢ ₵ ₽ ₺ ₪'
$typographic = 'Typo: ‽ ⁂ • • ¶ § © ® ™ ℠'

# Combining characters and visually weird sequences
$combiningExamples = 'Combining: é (e + U+0301), ạ (a + U+0323), ô (o + U+0302), ñ (n + U+0303)'
# The above line contains precomposed and combining-mark sequences.

# Here-strings with many scripts and special characters
$hereDouble = @'
Double-quoted here-string with many scripts and symbols:
Emoji and ZWJ sequences: 👩‍💻 👨‍👩‍👧‍👦 🧑‍🚀 🧑‍⚕️
Hebrew: שלום — Arabic: مرحبا — Hindi: नमस्ते — Chinese: 你好 — Japanese: こんにちは
Indic: ગુજરાતી বাংলা தமிழ் മലയാളം తెలుగు ಕನ್ನಡ
Box-drawing: ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼
Braille: ⠁⠃⠉⠙⠑⠋⠛
Archaic/rare: ᚠ ᚢ ᚦ ᚨ ᚱ (Runes)
Specials: ⁂ ‽ ✦ ✱ ✚ ✖ ✜ ✪
'@

$hereSingle = @'
Single-quoted here-string (verbatim):
Angle quotes: «» ‹›
Arrows: ➤ ➥ ➦ ➳ ➵
Fractions: ½ ⅓ ⅔ ¼ ¾ ⅛
Currency: ¢ ₤ ₳ ₵
Mathematical: ∑ ∏ ∂ ∇ ∞
'@

# A .NET regex that uses Unicode categories (So = Symbol, P = Punctuation)
# This regex pattern is for demonstration only; it will match sequences of 'Symbol' characters.
$regex = [regex]'\p{So}+'

# An array of assorted single characters for iteration
$chars = @(
    'Ω', '∆', '∑', '💡', '🧪', '📦', '☯', '☢', '☣', '⚛', '⚠', '✚', '✖', '✳', '✴',
    '⚡', '♯', '♭', '♪', '♫', '↺', '↻', '⊕', '⊗', '⊙', '◐', '◑', '◒', '◓', '◔'
)

# Print summary outputs (safe: no external commands invoked)
Write-Output '=== Unicode / Weird Symbols Test ==='
Write-Output 'π, Δ, Chinese variable, Russian variable, emoji var:'
Write-Output "  $π"
Write-Output "  $Δ"
Write-Output "  $变量"
Write-Output "  $ответ"
Write-Output '  $😺'
Write-Output ''
Write-Output 'Emoji sample:'
Write-Output "  $emoji"
Write-Output ''
Write-Output 'Weird symbols:'
Write-Output "  $weird"
Write-Output "  $math"
Write-Output "  $currency"
Write-Output "  $typographic"
Write-Output ''
Write-Output 'Combining examples (visual):'
Write-Output "  $combiningExamples"
Write-Output ''
Write-Output 'Double here-string excerpt:'
Write-Output ($hereDouble -split "`n" | Select-Object -First 6)
Write-Output ''
Write-Output 'Single here-string excerpt:'
Write-Output ($hereSingle -split "`n" | Select-Object -First 4)
Write-Output ''

Write-Output 'Characters array (joined):'
Write-Output ($chars -join ' ')

# Demonstrate regex matching against emoji string
if ($regex.IsMatch($emoji)) {
    Write-Output ''
    Write-Output 'Regex \p{So} found symbol characters in the emoji string.'
}
else {
    Write-Output ''
    Write-Output 'Regex \p{So} did NOT find symbol characters (unexpected on some platforms).'
}

# Demonstrate accessing a braced variable name
Write-Output ''
Write-Output "Braced variable name: ${'var with spaces'}"

# Show that variable names can be Unicode and include spaces when braced
Write-Output ''
Write-Output 'Finished — file contains many odd, rare, and combining Unicode characters.'
'@

# End of file.'
