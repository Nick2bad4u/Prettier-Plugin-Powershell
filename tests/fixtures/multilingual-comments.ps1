# English: This function prints greetings in many languages.
# 日本語: この関数は多言語の挨拶を出力します。
# Русский: Эта функция печатает приветствия на разных языках.
# العربية: هذه الدالة تطبع التحيات بلغات متعددة.
# हिन्दी: यह फ़ंक्शन कई भाषाओं में अभिवादन प्रिंट करता है।
function Show-MultilingualGreeting {
    param(
        [string] $Name = "世界"
    )

    Write-Output "Hello, $Name"
    Write-Output "こんにちは、$Name さん"
    Write-Output "Привет, $Name"
    Write-Output "مرحبا، $Name"
    Write-Output "नमस्ते, $Name"
}

Show-MultilingualGreeting -Name "PowerShell"
