param([Parameter(Mandatory=$true)][string]$ApkPath)
$ErrorActionPreference='Stop'
$artifact=Get-Item -LiteralPath $ApkPath
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[IO.Compression.ZipFile]::OpenRead($artifact.FullName)
try {
  $groups=@{}
  foreach($entry in $archive.Entries) {
    $category=if($entry.FullName -match '^lib/([^/]+)/') {"native/$($Matches[1])"}
      elseif($entry.FullName -match '^classes\d*\.dex$') {'dex'}
      elseif($entry.FullName -match '^assets/') {'assets'}
      else {'resources/other'}
    if(!$groups.ContainsKey($category)) {$groups[$category]=[long]0}
    $groups[$category]+=$entry.CompressedLength
  }
  $intel=[long]$groups['native/x86']+[long]$groups['native/x86_64']
  $arm32=[long]$groups['native/armeabi-v7a']
  [ordered]@{
    artifact=$artifact.Name
    bytes=$artifact.Length
    MiB=[math]::Round($artifact.Length/1MB,2)
    compressedEntriesMiB=@($groups.GetEnumerator() | Sort-Object Name | ForEach-Object {
      [ordered]@{category=$_.Key;MiB=[math]::Round($_.Value/1MB,2)}
    })
    arithmeticOnly=@{
      withoutIntelMiB=[math]::Round(($artifact.Length-$intel)/1MB,2)
      arm64OnlyMiB=[math]::Round(($artifact.Length-$intel-$arm32)/1MB,2)
      note='Subtracts existing ABI entry bytes only. Not a rebuilt APK or actual Play download size; ignores compression, shrinking and ZIP metadata changes.'
    }
  } | ConvertTo-Json -Depth 5
} finally {$archive.Dispose()}
