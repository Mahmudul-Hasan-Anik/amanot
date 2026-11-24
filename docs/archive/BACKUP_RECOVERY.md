# Amanot backup and recovery

## Selected destination — 10 October 2026

Owner selected [Google Drive backup folder](https://drive.google.com/drive/folders/1Ad0sggyHrv-p--n9R_ecZK8-J_clZPxQ). Sharing rechecked on 10 October: folder name Amanot, general access Restricted, only the owner listed. No sharing permissions changed. Upload only the encrypted `.amanotbak` file after creating and inspecting it; keep its passphrase separately. This replaces the earlier external-drive choice. Folder selection does not configure automatic backups.

### Actual snapshot — 10 October 2026

Owner's `create` command reported `encrypted_backup_created` followed by `integrity_verified`. File: `%LOCALAPPDATA%\Amanot\backups\amanot-20261010-153451.amanotbak`; snapshot UTC `2026-10-10T09:35:38.971Z`; database dump 589345 bytes, profile photos 0, `databaseOnly: false`. Independently read the encrypted file SHA-256 and matched the owner's output: `9499e864f75fe8942125c9b4dcab2494dc1ddd84d3c622d98e6f512b09a61f11`. This confirms the local encrypted artifact; it does not prove restore or off-site retention.

Uploaded this 786160-byte encrypted file to the selected private Amanot folder through the signed-in Drive UI. The UI reported **1 upload complete** and showed the matching filename. Evidence: `amanot-backup-uploaded.png` in the task proof directory. Cloud download/checksum verification was attempted but not completed; upload confirmation alone is not a round-trip integrity or recovery test.

Restore environment preflight: Docker and Supabase CLI not found on PATH, no Docker/PostgreSQL installation found in their standard Program Files locations, and `wsl --status` reports WSL not installed. Approximately 9.7 GiB remained on C: at this check. Prepare a Docker-compatible local Supabase environment with adequate disk space before decrypting/restoring. Docker/WSL installation may require administrator actions and a Windows restart; neither has been installed by the agent. The passphrase stays with the owner and must be entered privately for rehearsal. Actual restore and cleanup remain pending.

Official PostgreSQL 17.11 command-line tools were extracted to ignored `.tools/postgresql17`; the installer SHA-256 matches winget metadata (`612c7f5400a003aaffa0372cb273eed52278f93c680ab911eb9cb2229e329072`). `backup.ps1 -Mode check` successfully runs pg_dump/pg_restore/psql. Tools are discovered by the wrapper without changing the system PATH. The package uses the [official EDB extraction options](https://www.enterprisedb.com/docs/supported-open-source/postgresql/installing/command_line_parameters/); no database service was installed. A Supabase-compatible restore environment is still pending.

Future exports require owner entry of the private database URL, server-only Storage key and a separately retained backup passphrase. These values are not retained in the agent process and must not be posted in chat. The wrapper checks tools before asking for secrets and automatically decrypts/inspects a newly created file before reporting it ready for upload.

The owner-operated tools encrypt a custom-format PostgreSQL dump and private **profile photos** into one `.amanotbak` file. AES-256-GCM authenticates the file; a 16+ character passphrase derives the key with scrypt. No plaintext dump is written to disk during export. Export and integrity inspection have succeeded for the snapshot above; disaster restore remains unverified.

## Prerequisites

- Official PostgreSQL `pg_dump`, `pg_restore` and `psql` on PATH. Use a client matching or newer than the hosted server, at least version 16 for system certificate roots. TLS uses `verify-full`. The PowerShell wrapper discovers the official Supabase CA at ignored `.tools/certificates/supabase-prod-ca-2021.crt`; explicit `-PgSslRootCert` takes precedence, then existing `PGSSLROOTCERT`, then this local file, then system trust. The wrapper restores the original process setting on exit.
- Direct or session-pooler database connection with backup permissions. Do not use a transaction-pooler connection.
- A server-only Supabase key for downloading private profile photos. It belongs only in the owner's local process; never in the app, `.env` with public variables, GitHub public source, chat or shared logs.
- A long passphrase stored separately from the encrypted files, and a private destination outside the repository. The default is `%LOCALAPPDATA%\Amanot\backups`.
- A quiet maintenance window: do not post ledger entries, change settings, onboard members or upload photos during the snapshot. Export failure must not be treated as a successful backup.

The scripts prompt privately for credentials and passphrase. They do not print member records or secrets. Existing NID image objects are not collected; only profile-photo paths are exported. If historical non-profile objects need retention, the owner must arrange their separate protected backup.

Database GRANT/REVOKE permissions are retained in the dump and restored, including RPC access restrictions. Owners are not reassigned from the source. The local target needs the corresponding platform roles; do not suppress ACL failures or treat a partial restore as successful.

## Create and verify

### Windows TLS correction — 10 October 2026

The default system trust failed certificate verification on this machine. Downloaded the public CA from the project's **Database Settings → SSL configuration → Download certificate** link: [official Supabase CA](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt). This matches the [Supabase psql instructions](https://supabase.com/docs/guides/database/psql). No OS certificate store or hosted security settings were changed, and `verify-full` remains mandatory.

A single session-pooler connection using this CA and an intentionally invalid dummy password reached authentication rejection instead of TLS failure. This verifies the current chain/hostname check, not the owner's real credentials or backup permissions. Run `diagnose` again with the private real URI; export, Storage and restore still require their own verification. The ignored CA file is machine-local: on another computer download it from the dashboard and pass `-PgSslRootCert` or place it at the same local path. Do not disable TLS verification to resolve future certificate errors.

If a create attempt fails, first run `backup.ps1 -Mode diagnose`. It asks only for the private database URI and tests the connection, required tables and schema-only export without creating a backup. Errors expose only an allowlisted `[backup:stage/reason]` line (authentication, DNS/network, TLS, server/client version, permissions, etc.); raw PostgreSQL stderr, URLs, credentials and records are never printed. Share only that safe line for troubleshooting. TLS verification stays enabled. Passing diagnose does not verify row-data export, Storage or actual restore.

From the `app` folder:

```powershell
.\scripts\backup.ps1 -Mode check
.\scripts\backup.ps1 -Mode create
.\scripts\backup.ps1 -Mode inspect -InputFile 'C:\private\amanot-YYYYMMDD-HHMMSS.amanotbak'
```

`inspect` checks decryption, authentication tag, dump checksum and every photo checksum/path. It does not restore a database. An explicit `-DatabaseOnly` export omits files and is not a complete profile-photo backup. Output files are never overwritten.

Run `create` in your own interactive terminal. Use the project's direct/session-pooler URL (URL-encode special characters in the password), the hosted HTTPS project URL, and the server-only Storage key. Retain the passphrase separately before continuing. The final output names the encrypted file to upload to the selected Drive folder. `create` already performs `inspect`; the separate inspect command is useful when checking a downloaded copy later. Neither check proves actual restore.

Keep the pre-pilot snapshot and at least seven daily/after-work snapshots initially. Copy encrypted files to an owner-controlled second device or private off-site location. Keep the passphrase separately; losing it makes the backups unrecoverable. Establish retention and access with the association before rollout.

## Local restore rehearsal

Use a local Supabase-compatible PostgreSQL cluster with the matching platform roles/extensions already available, then create a **new empty database** named `amanot_restore_*`. A stock PostgreSQL install may lack Supabase extensions; a dump failing on missing roles/extensions is not a successful rehearsal. Never point the rehearsal at the live project. The tool rejects remote hosts, other database names and nonempty databases; it does not drop or replace existing tables.

Environment preparation order:

1. Prepare sufficient free disk space, install/start a Docker-compatible runtime and satisfy Windows WSL/virtualization prerequisites. Follow the [official Supabase local development setup](https://supabase.com/docs/guides/local-development). Installation may require administrator access/restart; do not restart during active work without owner coordination.
2. Use an isolated local Supabase project/cluster for recovery, not the app's live project. Check its Postgres version and available extensions/roles against the source archive. Create a new `amanot_restore_*` database from the empty template in that cluster; the cluster supplies platform roles and extension binaries. Do not load the dump over an initialized Supabase database containing existing tables.
3. Owner enters the backup passphrase privately into the existing wrapper and supplies only the local target URL. Keep ACL restoration enabled. On any missing-role/extension or duplicate-object error, retain the failed target for diagnosis and create a fresh target for a corrected attempt; do not suppress errors to obtain a pass.
4. Require `local_restore_completed` with `metricsVerified: true`, then perform the per-record/auth/permission review below. Do not equate count/total equality with full application recovery.

```powershell
.\scripts\backup.ps1 -Mode rehearse -InputFile 'C:\private\amanot-YYYYMMDD-HHMMSS.amanotbak' -PhotosOutput 'C:\private\rehearsal-photos-YYYYMMDD'
```

The wrapper privately asks for the local target URL and backup passphrase. Recovered photos are plaintext private files: use an owner-only directory on an encrypted disk, and never a public/synced/shared folder. The tool validates paths and refuses to overwrite a photo directory.

After restore: compare member/ledger counts, account totals, dues years and profile-file counts/checksums with the source snapshot. Test disposable staff/member login and denied access. Record the date, snapshot checksum, expected/actual totals and result. Do not mark recovery passed from an `inspect` result alone.

New exports include encrypted source member/profile/transaction counts and transaction/cash totals. The rehearsal compares these automatically after `pg_restore` and refuses success if they differ. This supplements owner review of individual balances, dues years and permissions; it does not replace it. Counts/totals are not printed in logs.

## Actual disaster recovery

An actual new hosted Supabase restore requires owner access and a reviewed platform-specific procedure: restore schema/data and auth configuration, upload private photos with original paths, confirm storage limits/RLS/RPC grants, disable recovered sessions/refresh tokens, reconfigure Edge Function secrets and rebuild/reconfigure the app if the project URL changes. Signing credentials and EAS account recovery are separate from this database backup. The local rehearsal tool intentionally does not automate writes to a live replacement project.

Current status: owner-operated real export and integrity inspection succeeded; local encrypted file checksum independently matched; Drive upload visibly completed. Encryption/integrity and restore-safety guards also pass synthetic tests. Actual local restore, cloud download/checksum verification and cleanup remain pending.
