// Never print subprocess stderr, exception messages, URLs, paths or credentials.
const messages={
  authentication:'Database authentication failed. Check the database password and connection URI privately.',
  dns:'Database hostname could not be resolved. Check the URI hostname and network.',
  connection:'Database connection failed or timed out. Check network access and the selected connection method.',
  tls:'TLS certificate verification failed. Configure the trusted CA privately; keep verify-full enabled.',
  version:'pg_dump is older than the database server. Use matching or newer PostgreSQL client tools.',
  permission:'Database permission denied. Check the backup role permissions privately.',
  missing_schema:'A required database table or schema is missing. Check the project and migrations.',
  missing_tool:'A required PostgreSQL tool could not start. Run backup.ps1 -Mode check.',
  size:'Backup exceeded the configured safety limit.',
  timeout:'A backup operation timed out. Check connectivity and retry during a quiet window.',
  storage_auth:'Storage rejected the server-only key. Check the key and project privately.',
  storage_missing:'A referenced profile photo was not found. No complete backup was written.',
  storage_http:'A profile photo download failed. No complete backup was written.',
  invalid_passphrase:'Use a backup passphrase containing at least 16 characters.',
  changed:'Records changed during the backup. Retry during a quiet maintenance window.',
  exists:'The output already exists. Choose a new file or restore directory.',
  disk:'The destination is full or not writable. Check available disk space and permissions.',
  configuration:'A required backup setting is missing or invalid. Check the documented private inputs.',
  unknown:'This step failed. No raw diagnostics or private values were printed.',
};
const stages=new Set(['configuration','database-connect','database-metrics','database-dump','storage-manifest','storage-photos','snapshot-check','encrypt','write-backup','read-backup','decrypt-inspect','restore-target','restore-database','restore-metrics','restore-photos']);
function failure(reason){const error=new Error('Private backup operation failed');error.backupReason=Object.hasOwn(messages,reason)?reason:'unknown';return error;}
function classifyPostgres(stderr){
  const s=String(stderr).toLowerCase();
  if(/password authentication failed|authentication failed|tenant or user not found/.test(s))return 'authentication';
  if(/could not translate host name|no such host|name or service not known|getaddrinfo/.test(s))return 'dns';
  if(/server version.*pg_dump version|server version mismatch|aborting because of server version/.test(s))return 'version';
  if(/certificate|ssl error|tls error|root certificate/.test(s))return 'tls';
  if(/permission denied|must be (?:owner|superuser)|row-level security/.test(s))return 'permission';
  if(/relation .* does not exist|schema .* does not exist/.test(s))return 'missing_schema';
  if(/connection (?:refused|timed out)|could not connect|timeout expired|network is unreachable|server closed the connection/.test(s))return 'connection';
  return 'unknown';
}
async function step(stage,action){try{return await action();}catch(error){if(error&&typeof error==='object'&&!error.backupStage)error.backupStage=stage;throw error;}}
function formatDiagnostic(error){
  const stage=stages.has(error?.backupStage)?error.backupStage:'configuration';
  let reason=Object.hasOwn(messages,error?.backupReason)?error.backupReason:'unknown';
  if(reason==='unknown'){
    if(error?.code==='EEXIST')reason='exists';
    else if(['EACCES','EPERM','ENOSPC','EROFS'].includes(error?.code))reason='disk';
    else if(error?.code==='ERR_INVALID_URL')reason='configuration';
    else if(['ENOTFOUND','EAI_AGAIN'].includes(error?.cause?.code))reason='dns';
    else if(['ETIMEDOUT','ECONNREFUSED','UND_ERR_CONNECT_TIMEOUT'].includes(error?.cause?.code))reason='connection';
    else if(['CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','SELF_SIGNED_CERT_IN_CHAIN','DEPTH_ZERO_SELF_SIGNED_CERT'].includes(error?.cause?.code))reason='tls';
    else if(error?.name==='TimeoutError'||error?.name==='AbortError')reason='timeout';
  }
  return `[backup:${stage}/${reason}] ${messages[reason]}`;
}
module.exports={failure,classifyPostgres,step,formatDiagnostic};
