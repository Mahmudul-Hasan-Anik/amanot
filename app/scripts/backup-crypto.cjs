const { randomBytes, scryptSync, createCipheriv, createDecipheriv, createHash } = require('node:crypto');
const MAGIC = Buffer.from('AMANOTB1');
const MAX_BYTES = 512 * 1024 * 1024;
const digest = value => createHash('sha256').update(value).digest('hex');
function key(password,salt) {
  if(typeof password!=='string'||password.length<16) throw Error('Use a backup passphrase with at least 16 characters.');
  return scryptSync(password,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});
}
function encrypt(value,password) {
  const plain=Buffer.from(JSON.stringify(value));
  if(plain.length>MAX_BYTES) throw Error('Backup exceeds the 512 MiB safety limit.');
  const salt=randomBytes(32),iv=randomBytes(12),header=Buffer.concat([MAGIC,salt,iv]);
  const cipher=createCipheriv('aes-256-gcm',key(password,salt),iv);cipher.setAAD(header);
  const bytes=Buffer.concat([cipher.update(plain),cipher.final()]);
  plain.fill(0);
  return Buffer.concat([header,cipher.getAuthTag(),bytes]);
}
function decrypt(bytes,password) {
  if(bytes.length<68||bytes.length>MAX_BYTES+68||!bytes.subarray(0,8).equals(MAGIC)) throw Error('Unsupported or damaged backup.');
  const decipher=createDecipheriv('aes-256-gcm',key(password,bytes.subarray(8,40)),bytes.subarray(40,52));
  decipher.setAAD(bytes.subarray(0,52));decipher.setAuthTag(bytes.subarray(52,68));
  let plain;
  try { plain=Buffer.concat([decipher.update(bytes.subarray(68)),decipher.final()]);return JSON.parse(plain.toString('utf8')); }
  catch { throw Error('Wrong passphrase or damaged backup. Nothing was restored.'); }
  finally { plain?.fill(0); }
}
function validate(bundle) {
  if(bundle?.format!==1||typeof bundle.createdAt!=='string'||!Array.isArray(bundle.photos)||bundle.photos.length>10000) throw Error('Invalid backup bundle.');
  const dump=Buffer.from(bundle.database?.data||'','base64');
  if(dump.subarray(0,5).toString()!=='PGDMP'||digest(dump)!==bundle.database?.sha256) throw Error('Database dump integrity check failed.');
  const seen=new Set();
  for(const photo of bundle.photos) {
    if(!/^[0-9a-f-]{36}\/avatar(-[0-9a-f-]{36})?\.(jpg|jpeg|png|webp)$/i.test(photo.path)||seen.has(photo.path)) throw Error('Invalid or duplicate profile photo path.');
    seen.add(photo.path);
    const data=Buffer.from(photo.data||'','base64');
    if(data.length===0||data.length>5*1024*1024||digest(data)!==photo.sha256) throw Error('Profile photo integrity check failed.');
  }
  return {createdAt:bundle.createdAt,databaseBytes:dump.length,photoCount:bundle.photos.length,databaseOnly:bundle.databaseOnly===true};
}
module.exports={encrypt,decrypt,validate,digest,MAX_BYTES};
