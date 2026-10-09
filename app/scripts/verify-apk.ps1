param([Parameter(Mandatory=$true)][string]$ApkPath)
$ErrorActionPreference='Stop'
$artifact=Get-Item -LiteralPath $ApkPath
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive=[IO.Compression.ZipFile]::OpenRead($artifact.FullName)
try {
  $names=@($archive.Entries | ForEach-Object {$_.FullName})
  $manifest=$names -contains 'AndroidManifest.xml'
  $bundle=$names -contains 'assets/index.android.bundle'
  $dex=@($archive.Entries | Where-Object {$_.FullName -match '^classes\d*\.dex$'})
  $secureStore=$false; $crypto=$false
  foreach($entry in $dex) {
    $stream=$entry.Open(); $memory=[IO.MemoryStream]::new()
    try {$stream.CopyTo($memory);$symbols=[Text.Encoding]::ASCII.GetString($memory.ToArray())}
    finally {$stream.Dispose();$memory.Dispose()}
    $secureStore=$secureStore -or $symbols.Contains('ExpoSecureStore')
    $crypto=$crypto -or $symbols.Contains('ExpoCrypto')
  }
  if(!$manifest -or !$bundle -or !$dex.Count) {throw 'Incomplete Android artifact.'}
  [ordered]@{bytes=$artifact.Length;sha256=(Get-FileHash -LiteralPath $artifact.FullName -Algorithm SHA256).Hash.ToLowerInvariant();manifest=$manifest;dexCount=$dex.Count;bundle=$bundle;secureStoreNative=$secureStore;cryptoNative=$crypto} | ConvertTo-Json
} finally {$archive.Dispose()}
# Archive/module inspection is not signature verification or a device test.
