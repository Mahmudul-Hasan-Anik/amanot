param(
  [ValidateSet('check','diagnose','create','inspect','rehearse')][string]$Mode='create',
  [string]$Output,
  [string]$InputFile,
  [string]$PhotosOutput,
  [switch]$DatabaseOnly,
  [string]$PgBinDirectory,
  [string]$PgSslRootCert
)
$ErrorActionPreference='Stop'
function Read-PrivateValue([string]$Prompt) {
  $secureValue=Read-Host $Prompt -AsSecureString
  $valuePointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($valuePointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($valuePointer); $secureValue.Dispose() }
}
$names=@('AMANOT_BACKUP_PASSPHRASE','AMANOT_DATABASE_URL','AMANOT_RESTORE_DATABASE_URL','AMANOT_SUPABASE_SERVICE_KEY','AMANOT_SUPABASE_URL','PGSSLROOTCERT')
$previous=@{}
foreach($name in $names) { $previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
$previousPath=$env:PATH
try {
  if(!$PgBinDirectory) { $PgBinDirectory=Join-Path $PSScriptRoot '..\..\.tools\postgresql17\bin' }
  if(Test-Path -LiteralPath $PgBinDirectory -PathType Container) { $env:PATH=(Resolve-Path -LiteralPath $PgBinDirectory).Path+[IO.Path]::PathSeparator+$env:PATH }
  if(!$PgSslRootCert -and !$env:PGSSLROOTCERT) {
    $defaultCa=Join-Path $PSScriptRoot '..\..\.tools\certificates\supabase-prod-ca-2021.crt'
    if(Test-Path -LiteralPath $defaultCa -PathType Leaf) { $PgSslRootCert=$defaultCa }
  }
  if($PgSslRootCert) {
    if(!(Test-Path -LiteralPath $PgSslRootCert -PathType Leaf)) { throw 'Trusted CA file is missing. Provide -PgSslRootCert with the official Supabase certificate path.' }
    $env:PGSSLROOTCERT=(Resolve-Path -LiteralPath $PgSslRootCert).Path
  }
  if($Mode -in @('check','diagnose','create')) {
    if($env:PGSSLROOTCERT) { Write-Output 'Database TLS: verify-full with configured CA trust.' }
    else { Write-Output 'Database TLS: verify-full with system trust; configure the official Supabase CA if validation fails.' }
  }
  if(!(Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js is required before backup can start.' }
  if($Mode -ne 'inspect') {
    foreach($tool in @('pg_dump','pg_restore','psql')) {
      if(!(Get-Command $tool -ErrorAction SilentlyContinue)) { throw "$tool is missing. Prepare official PostgreSQL client tools or pass -PgBinDirectory before entering any secrets." }
      $versionOutput=& $tool --version
      if($LASTEXITCODE -ne 0) { throw "$tool could not run. Check its runtime dependencies." }
      if($versionOutput -notmatch '\(PostgreSQL\)\s+(\d+)\.' -or [int]$Matches[1] -lt 16) { throw "$tool must be PostgreSQL version 16 or newer." }
      Write-Output $versionOutput
    }
  }
  if($Mode -eq 'check') { Write-Output 'Backup client tools ready. Credentials, Drive upload and actual restore are not verified.'; return }
  if($Mode -eq 'diagnose') {
    if(!$env:AMANOT_DATABASE_URL) { $env:AMANOT_DATABASE_URL=Read-PrivateValue 'PostgreSQL connection URL (private; direct or session pooler)' }
    & node (Join-Path $PSScriptRoot 'backup.cjs') --diagnose
    if($LASTEXITCODE -ne 0) { throw 'Database diagnostic failed. Share only the safe [backup:stage/reason] line; do not share private inputs.' }
    return
  }
  $env:AMANOT_BACKUP_PASSPHRASE=Read-PrivateValue 'Backup passphrase (16+ characters; keep a separate private copy)'
  if($Mode -eq 'create') {
    $confirmation=Read-PrivateValue 'Confirm backup passphrase'
    if($confirmation -cne $env:AMANOT_BACKUP_PASSPHRASE) { throw 'Passphrases do not match.' }
    $confirmation=$null
    if(!$env:AMANOT_DATABASE_URL) { $env:AMANOT_DATABASE_URL=Read-PrivateValue 'PostgreSQL connection URL (direct or session pooler, not transaction pooler)' }
    if(!$DatabaseOnly) {
      if(!$env:AMANOT_SUPABASE_URL) { $env:AMANOT_SUPABASE_URL=Read-Host 'Supabase HTTPS project URL' }
      if(!$env:AMANOT_SUPABASE_SERVICE_KEY) { $env:AMANOT_SUPABASE_SERVICE_KEY=Read-PrivateValue 'Server-only Supabase key for private Storage backup' }
    }
    if(!$Output) { $Output=Join-Path $env:LOCALAPPDATA ('Amanot\backups\amanot-'+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.amanotbak') }
    $nodeArguments=@((Join-Path $PSScriptRoot 'backup.cjs'),'--create','--output',$Output)
    if($DatabaseOnly) { $nodeArguments+='--database-only' }
  } else {
    if(!$InputFile) { throw 'Provide -InputFile for inspect/rehearse.' }
    $nodeArguments=@((Join-Path $PSScriptRoot 'backup.cjs'),('--'+$Mode),'--input',$InputFile)
    if($Mode -eq 'rehearse') {
      if(!$env:AMANOT_RESTORE_DATABASE_URL) { $env:AMANOT_RESTORE_DATABASE_URL=Read-PrivateValue 'Local empty disposable database URL (database name amanot_restore_*)' }
      if($PhotosOutput) { $nodeArguments+=@('--photos-output',$PhotosOutput) }
    }
  }
  & node @nodeArguments
  if($LASTEXITCODE -ne 0) { throw 'Backup command failed. See BACKUP_RECOVERY.md; do not paste credentials into chat or logs.' }
  if($Mode -eq 'create') {
    & node (Join-Path $PSScriptRoot 'backup.cjs') --inspect --input $Output
    if($LASTEXITCODE -ne 0) { throw 'Created backup failed integrity verification. Do not upload or use it for cleanup.' }
    Write-Output ('Encrypted backup created and inspected: '+$Output)
    Write-Output 'Upload only this .amanotbak file to the selected private Amanot Drive folder. Real restore rehearsal is still required.'
  }
} finally {
  $env:PATH=$previousPath
  foreach($name in $names) {
    if($null -eq $previous[$name]) { Remove-Item -LiteralPath ('Env:'+ $name) -ErrorAction SilentlyContinue }
    else { [Environment]::SetEnvironmentVariable($name,$previous[$name],'Process') }
  }
}
