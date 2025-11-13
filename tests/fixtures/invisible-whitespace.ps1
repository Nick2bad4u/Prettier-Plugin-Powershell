# Contains zero-width and non-breaking spaces around keywords and operators to stress tokenizer heuristics.

function⁠ Test-InvisibleWhitespace {
  if⁠ ($value ​-ne⁠ 0) {
    Write-Output "visible space trimmed"
  } else⁠ {
    $value =  $value + 1
  }
  return⁠ $value
}

e
