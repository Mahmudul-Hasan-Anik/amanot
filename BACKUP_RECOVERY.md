# Amanot backup and recovery

The owner-operated tools encrypt a custom-format PostgreSQL dump and private **profile photos** into one `.amanotbak` file. AES-256-GCM authenticates the file; a 16+ character passphrase derives the key with scrypt. No plaintext dump is written to disk during export. This is development tooling, not proof that a real backup or disaster restore has succeeded.

## Prerequisites

- Official PostgreSQL `pg_dump`, `pg_restore` and `psql` on PATH. Use a client matching or newer than the hosted server, at least version 16 for system certificate roots. TLS uses `verify-full`; provide `PGSSLROOTCERT` privately if system trust is insufficient.
- Direct or session-pooler database connection with backup permissions. Do not use a transaction-pooler connection.
- A server-only Supabase key for downloading private profile photos. It belongs only in the owner's local process; never in the app, `.env` with public variables, GitHub public source, chat or shared logs.
- A long passphrase stored separately from the encrypted files, and a private destination outside the repository. The default is `%LOCALAPPDATA%\Amanot\backups`.
- A quiet maintenance window: do not post ledger entries, change settings, onboard members or upload photos during the snapshot. Export failure must not be treated as a successful backup.

The scripts prompt privately for credentials and passphrase. They do not print member records or secrets. Existing NID image objects are not collected; only profile-photo paths are exported. If historical non-profile objects need retention, the owner must arrange their separate protected backup.

Database GRANT/REVOKE permissions are retained in the dump and restored, including RPC access restrictions. Owners are not reassigned from the source. The local target needs the corresponding platform roles; do not suppress ACL failures or treat a partial restore as successful.

## Create and verify

From the `app` folder:

```powershell
.\scripts\backup.ps1 -Mode create
.\scripts\backup.ps1 -Mode inspect -InputFile 'C:\private\amanot-YYYYMMDD-HHMMSS.amanotbak'
```

`inspect` checks decryption, authentication tag, dump checksum and every photo checksum/path. It does not restore a database. An explicit `-DatabaseOnly` export omits files and is not a complete profile-photo backup. Output files are never overwritten.

Keep the pre-pilot snapshot and at least seven daily/after-work snapshots initially. Copy encrypted files to an owner-controlled second device or private off-site location. Keep the passphrase separately; losing it makes the backups unrecoverable. Establish retention and access with the association before rollout.

## Local restore rehearsal

Use a local Supabase-compatible PostgreSQL cluster with the matching platform roles/extensions already available, then create a **new empty database** named `amanot_restore_*`. A stock PostgreSQL install may lack Supabase extensions; a dump failing on missing roles/extensions is not a successful rehearsal. Never point the rehearsal at the live project. The tool rejects remote hosts, other database names and nonempty databases; it does not drop or replace existing tables.

```powershell
.\scripts\backup.ps1 -Mode rehearse -InputFile 'C:\private\amanot-YYYYMMDD-HHMMSS.amanotbak' -PhotosOutput 'C:\private\rehearsal-photos-YYYYMMDD'
```

The wrapper privately asks for the local target URL and backup passphrase. Recovered photos are plaintext private files: use an owner-only directory on an encrypted disk, and never a public/synced/shared folder. The tool validates paths and refuses to overwrite a photo directory.

After restore: compare member/ledger counts, account totals, dues years and profile-file counts/checksums with the source snapshot. Test disposable staff/member login and denied access. Record the date, snapshot checksum, expected/actual totals and result. Do not mark recovery passed from an `inspect` result alone.

New exports include encrypted source member/profile/transaction counts and transaction/cash totals. The rehearsal compares these automatically after `pg_restore` and refuses success if they differ. This supplements owner review of individual balances, dues years and permissions; it does not replace it. Counts/totals are not printed in logs.

## Actual disaster recovery

An actual new hosted Supabase restore requires owner access and a reviewed platform-specific procedure: restore schema/data and auth configuration, upload private photos with original paths, confirm storage limits/RLS/RPC grants, disable recovered sessions/refresh tokens, reconfigure Edge Function secrets and rebuild/reconfigure the app if the project URL changes. Signing credentials and EAS account recovery are separate from this database backup. The local rehearsal tool intentionally does not automate writes to a live replacement project.

Current status: encryption/integrity and restore-safety guards are tested with synthetic fixtures. No real export or restore is claimed; credentials, destination and owner rehearsal are pending.
