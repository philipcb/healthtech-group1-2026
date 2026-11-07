# HealthTech

HealthTech is a project for Aker Solutions in the NTNU course TDT4290 Customer Driven Project. We are a group of six students who continued the project in TDT4290.

<table>
  <tr>
    <td rowspan="2" align="center" width="50%">
      <img src="./assets/showcase/operator-noise-month.png" alt="Operator monthly view of noise data" width="100%" />
      <br />
      <sub>A month of an operator's noise data</sub>
    </td>
    <td align="center" width="50%">
      <img src="./assets/showcase/foreman-team-noise.png" alt="Foreman noise data for team" width="100%" />
      <br />
      <sub>A foreman's vibration data for their team</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="./assets/showcase/operator-overview-week.png" alt="Operator overview of a week" width="100%" />
      <br />
      <sub>An operator's weekly overview</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="./assets/showcase/foreman-operator-noise-details.png" alt="Foreman viewing noise data for an operator" width="100%" />
      <br />
      <sub>A foreman viewing noise data for an operator</sub>
    </td>
    <td align="center" width="50%">
      <img src="./assets/showcase/foreman-overview-map.png" alt="A foreman's overview of the map" width="100%" />
      <br />
      <sub>A foreman's overview of the map</sub>
    </td>
  </tr>
</table>

## Requirements

- [Docker](https://www.docker.com/get-started)
- [.NET SDK 10](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)
- [Node](https://nodejs.org/en)
- [pnpm](https://pnpm.io/)

## Documentation

See [PRODUCTION.md](./PRODUCTION.md) for instructions about how to deploy to production.

---

## Getting started with local development

### Set up environment variables

Copy the `.env.example` files into `.env` files in both `./backend/` and `./frontend/` from project root.

```sh	
# From project root
cp ./backend/.env.example ./backend/.env
cp ./frontend/.env.example ./frontend/.env
```

Remember to change the default database password (`your_secure_password`) in `POSTGRES_PASSWORD` and `DATABASE_URL`.

### Set up the backend

1. Download the CSV-files from [https://drive.google.com/drive/folders/13XkM6DRK6iyz9pC4Akvj1-1KjRx4wFkc?usp=drive_link](https://drive.google.com/drive/folders/13XkM6DRK6iyz9pC4Akvj1-1KjRx4wFkc?usp=drive_link).
2. Copy them into `./backend/seed/`.

The setup script uses `dotnet ef`, which you can install by running: `dotnet tool install --global dotnet-ef`

Then run the setup script from the project root. It starts the database, creates the login and aggregate databases, runs the migrations, seeds the sample data and fills the aggregate database. Run it once, on an empty database. Seeding may take a few minutes.

```sh
# From project root
./databaseSetUp.sh
```

To update the aggregate database with new data later, run only the aggregate job. `TZ=UTC` is needed for the stored hours to be right.

```sh
cd backend && TZ=UTC dotnet run --project AggregateDatabaseHandler
```

### Start the backend

```sh
# From project root
cd backend

# Start the backend:
dotnet watch run --project src
# If you have the C# VS Code extension installed, you can also start the backend with F5.

# The backend will be running at http://localhost:5063
```

### Run the frontend

In a new terminal, run the following commands:

```sh
# Navigate to the frontend directory
cd frontend

# Install dependencies
pnpm install

# Start the frontend
pnpm run dev

# The frontend will be running at http://localhost:5173
```

The frontend's API client (types, Zod schemas, fetch functions and TanStack Query hooks) is generated from the backend's OpenAPI spec. To update it after an API change, see [frontend/app/lib/api/README.md](frontend/app/lib/api/README.md).

## Run tests

```sh
# Navigate to the backend directory
cd backend

# Run tests
dotnet test
```

## Linting and formatting

In the backend directory, you can run the following commands:

```sh
# Navigate to the backend directory
cd backend

# Format the backend code
dotnet csharpier format .

# Check for linting errors
dotnet csharpier check .
```

In the frontend directory, you can run the following commands:

```sh
# Navigate to the frontend directory
cd frontend

# Lint and format
pnpm run check:fix

# Or separately:

# Check for linting errors and apply safe fixes
# pnpm run lint:fix

# Check for formatting errors and apply safe fixes
# pnpm run format:fix

# Omitting the `:fix` will only check for errors and not apply any fixes.
```
