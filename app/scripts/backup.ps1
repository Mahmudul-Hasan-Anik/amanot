param(
  [ValidateSet('create','inspect','rehearse')][string]$Mode='create',
  [string]$Output,
  [string]$InputFile,
  [string]$PhotosOutput,
  [switch]$DatabaseOnly
)
$ErrorActionPreference='Stop'
function Read-PrivateValue([string]$Prompt) {
  $secureValue=Read-Host $Prompt -AsSecureString
  $valuePointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($valuePointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($valuePointer); $secureValue.Dispose() }
}
$names=@('AMANOT_BACKUP_PASSPHRASE','AMANOT_DATABASE_URL','AMANOT_RESTORE_DATABASE_URL','AMANOT_SUPABASE_SERVICE_KEY','AMANOT_SUPABASE_URL')
$previous=@{}
foreach($name in $names) { $previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process') }
try {
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
} finally {
  foreach($name in $names) { [Environment]::SetEnvironmentVariable($name,$previous[$name],'Process') }
}
