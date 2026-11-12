# Setting up HealthTech on Windows

Follow these steps from a clean machine. Run all commands in **PowerShell** from the repository root, unless a step says otherwise.

## 1. Install the tools

| Tool | Note |
| --- | --- |
| **Git for Windows** | Includes Git Bash, which is needed for the database script. |
| **Docker Desktop** | Start it after installing and keep it running. |
| **.NET SDK 10** | The project uses `net10.0`. |
| **Node.js** | Latest LTS. |
| **pnpm** | `npm install -g pnpm` |
| **dotnet-ef** | `dotnet tool install --global dotnet-ef` |

Restart the terminal and check the installation:

```powershell
git --version; docker --version; dotnet --version; node --version; pnpm --version; dotnet ef --version
```

## 2. Get the code

```powershell
git clone <repo-url>
cd healthtech-group1-2026 #Or your folder name
```

## 3. Create the `.env` files

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Open `backend/.env` and replace every `your_secure_password…` with your own password. The password must be the same on the password line and the URL line:

| Password | URL line |
| --- | --- |
| `POSTGRES_PASSWORD` | `DATABASE_URL` |
| `LOGIN_PASSWORD` | `LOGIN_DATABASE_URL` |
| `AGGREGATE_PASSWORD` | `AGGREGATE_DATABASE_URL` |

Use only letters and numbers. Keep `POSTGRES_USER=postgres` and `POSTGRES_DB=healthtech`, because the setup script has them hard-coded. `frontend/.env` needs no changes.

## 4. Add the seed data

Download the CSV files from the Google Drive folder linked in the README, and put `DustData.csv`, `NoiseData.csv` and `VibrationData.csv` in `backend/seed/`. They are not in Git, and the seeding fails without them.

## 5. Fix line endings and prepare the script

Windows checks out files with CRLF line endings, which makes bash fail. These commands convert `backend/.env` and make a cleaned copy of the setup script in your temp folder (the repository is not changed). **Run them after you have edited `backend/.env`.**

```powershell
$envPath = (Resolve-Path backend/.env).Path
$text = [IO.File]::ReadAllText($envPath) -replace "`r`n", "`n"
[IO.File]::WriteAllText($envPath, $text, (New-Object Text.UTF8Encoding($false)))

$script = [IO.File]::ReadAllText((Resolve-Path databaseSetUp.sh).Path) -replace "`r`n", "`n" -replace "docker exec -it", "docker exec"
$tmp = Join-Path $env:TEMP "databaseSetUp.sh"
[IO.File]::WriteAllText($tmp, $script, (New-Object Text.UTF8Encoding($false)))
```

Check that it worked. The first command should print `True` and the second `False`:

```powershell
Test-Path $tmp
[IO.File]::ReadAllText($envPath).Contains("`r")
```

## 6. Set up the databases

Docker Desktop must be running. Use **the same PowerShell window as in step 5**, because `$tmp` only exists there.

```powershell
$env:MSYS_NO_PATHCONV = "1"
& "C:\Program Files\Git\bin\bash.exe" ($tmp -replace '\\','/')
```

- Use the `bash.exe` from Git Bash. Typing only `bash` starts WSL, which cannot find Docker.
- `MSYS_NO_PATHCONV=1` stops Git Bash from changing the path `/seed/seed.sql`.

The script starts the database container, creates the login and aggregate databases, runs the migrations for all three, seeds them and fills the aggregated database. This takes several minutes and uses a lot of memory and CPU, so the computer may be slow. You are done when you see `------Database set up with success!`.

These messages are normal and do not mean that something is wrong: `Failed executing DbCommand … __EFMigrationsHistory`, `table "seed_user_profile" does not exist, skipping`, and the NuGet warnings NU1902 and NU1903.

If the script stops halfway, the users have already been created and a new run fails. Reset with the command below (this deletes all local data in the databases), and run step 6 again:

```powershell
docker compose --env-file ./backend/.env down -v
```

## 7. Start the backend

```powershell
cd backend
dotnet watch run --project src
```

The backend runs on http://localhost:5063.

## 8. Start the frontend

In a new terminal:

```powershell
cd frontend
pnpm install
pnpm run dev
```

The frontend runs on http://localhost:5173.

## Daily use

- Start Docker Desktop, then the database: `docker compose --env-file ./backend/.env up -d db`
- Start the backend and the frontend as in steps 7 and 8.