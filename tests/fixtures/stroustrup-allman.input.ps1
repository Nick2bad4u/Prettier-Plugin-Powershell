function Test-Braces
{
    if ($first)
    {
        "first"
    }
    elseif ($second)
    {
        "second"
    }
    else
    {
        "last"
    }
    try
    {
        "try"
    }
    catch
    {
        "catch"
    }
    finally
    {
        "finally"
    }
    do
    {
        "while"
    }
    while ($false)
    do
    {
        "until"
    }
    until ($true)
    for ($i = 0; $i -lt 1; $i++)
    {
        "for"
    }
    foreach ($item in $items)
    {
        $item
    }
    while ($false)
    {
        "while"
    }
    switch ($value)
    {
        default { "switch" }
    }
    $result = if ($ready)
    {
        "ready"
    }
    else
    {
        "waiting"
    }
    $values = @{
        attempt = try
        {
            "try"
        }
        catch
        {
            "catch"
        };
        loop = do
        {
            "loop"
        }
        until ($true)
    }
}
