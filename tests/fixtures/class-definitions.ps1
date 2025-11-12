# Class definitions with inheritance, properties, methods, and static members.
class BaseEntity {
    [string] $Id
    [datetime] $CreatedAt

    BaseEntity() {
        $this.Id = [guid]::NewGuid().ToString()
        $this.CreatedAt = Get-Date
    }

    [string] ToString() {
        return "Entity: $($this.Id)"
    }
}

class ExtendedEntity : BaseEntity {
    [string] $Name
    [hashtable] $Metadata

    static [int] $InstanceCount = 0

    ExtendedEntity([string] $name) {
        $this.Name = $name
        $this.Metadata = @{}
        [ExtendedEntity]::InstanceCount++
    }

    [void] AddMetadata([string] $key, [object] $value) {
        $this.Metadata[$key] = $value
    }

    [string] ToString() {
        return "Extended: $($this.Name) (ID: $($this.Id))"
    }

    static [int] GetCount() {
        return [ExtendedEntity]::InstanceCount
    }
}

$entity = [ExtendedEntity]::new("TestEntity")
$entity.AddMetadata("Version", "1.0")
Write-Output $entity.ToString()
Write-Output "Total instances: $([ExtendedEntity]::GetCount())"
