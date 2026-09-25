if ($first) {
    "first"
}
elseif ($second) {
    "second"
}
else {
    "last"
}
try {
    "try"
}
catch [System.InvalidOperationException] {
    "typed"
}
catch {
    "catch"
}
finally {
    "finally"
}
do {
    "while"
}
while ($false)
do {
    "until"
}
until ($true)
