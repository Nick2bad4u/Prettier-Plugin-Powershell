function Test-Braces{
$result=if($ready){try{"ready"}catch{"failed"}}else{"waiting"}
$values=@{
condition=if($ready){"ready"}else{"waiting"}
attempt=try{"try"}catch{"catch"}finally{"finally"}
loop=do{"loop"}until($true)
}
:retry do{if($ready){break retry}else{"retry"}}while($false)
}
