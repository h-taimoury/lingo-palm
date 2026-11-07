# Sync local sense updates to Neon

Use this PowerShell guide after editing senses in Lingo Palm. SQLite supplies the values and Neon receives them. Each command updates a specific set of fields on existing senses. A sense shared by several sections needs one update.

## 1. Open PowerShell in the project

```powershell
Set-Location 'C:\Users\Fardin\Desktop\projects\lingo_palm'
$python = '.\backend\.venv\Scripts\python.exe'
$scripts = '.\artifacts\neon-transfer'
```

Keep this window open for the remaining steps. The scripts live in the Git-ignored `artifacts` directory on this computer. Keep a local copy if you change machines.

## 2. Check the connection setting

Open `backend\.env` in your editor. The existing `NEON_DATABASE_URL` line should contain the direct connection string for the intended Neon branch and database, including its security parameters. Keep the password in that file. Leave `DATABASE_URL` unset for ordinary local development so Django uses SQLite.

## 3. Choose the fields to sync and preview the differences

**For levels**, run the following. It selects every distinct sense linked to at least one local section and requires each selected sense to have level A, B, or C.

```powershell
$sync = Join-Path $scripts 'sync_sense_levels.py'
& $python $sync
```

**For translations in sections 8, 9, and 10**, use this script instead. It copies both `translation` and `short_translation`, including empty values, from the local senses in those three sections.

```powershell
$sync = Join-Path $scripts 'sync_translations_20261105.py'
& $python $sync
```

Read the counts before continuing. The preview only reads Neon. If there are zero differences and no pending migrations, you are done. If a sense is missing, its identity differs, or the script reports an unexpected migration, stop and resolve the mismatch first. New mappings and new dictionary records require a separate import. The original `transfer.py` was written for the first transfer into an empty database.

## 4. Apply the changes

For **levels**, continue directly to the apply command below. The level script creates a new timestamped backup on each apply that changes data.

For **translations**, the older script uses a fixed backup directory. Before each new apply, archive the previous run by renaming its directory. If a previous apply failed, inspect its backup and run the preview again before proceeding.

```powershell
$previous = Join-Path $scripts 'translations-20261105'
if (Test-Path (Join-Path $previous 'before.json')) {
    Rename-Item -LiteralPath $previous -NewName ('translations-archived-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
}
```

When the preview matches the changes you intend, run the selected script with the write flag.

```powershell
& $python $sync --apply
```

Each script backs up the affected Neon values before writing, then verifies the values within a transaction. Any pending migration listed in the preview can also affect the whole dictionary. For example, dictionary migration 0013 converts existing A1/A2 values to A, B1/B2 to B, and C1/C2 to C. Wait for the commit message.

## 5. Verify the committed data

```powershell
& $python $sync
```

For levels, look for `Levels differing before migrations: 0`. For translations, look for `"changed_senses": 0`. In both cases the pending migration list should be empty. The local `before.json` in the run's backup directory contains the previous Neon values.

## If PowerShell reports “failed to resolve host”

Copy just the hostname from your current Neon URL (the part between `@` and the next `/`). Run this in the same PowerShell window, then repeat the preview. This looks up a fresh address while preserving the hostname and connection settings.

```powershell
$neonHost = Read-Host 'Neon hostname only'
$env:PGHOSTADDR = Resolve-DnsName $neonHost -Type A -Server 1.1.1.1 -DnsOnly -ErrorAction Stop |
    Where-Object Type -eq A |
    Select-Object -First 1 -ExpandProperty IPAddress
```

After verification, clear the temporary address.

```powershell
Remove-Item Env:PGHOSTADDR -ErrorAction SilentlyContinue
```
