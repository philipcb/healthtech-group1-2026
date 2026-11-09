# Development View

The development view (from Kruchten's 4+1 view model) describes how the **source code is organised**: the build units, the modules inside them, and the dependencies between them. It is the map a developer needs to know *where code lives* and *which way dependencies are allowed to point*.

The diagrams below were derived from the actual imports (frontend) and type references (backend) in the codebase, not just the folder names. Arrows mean "depends on / imports".

## 1. Build units

The repository contains five independently built units, connected by project references, a generated API contract, and a shared database.

```mermaid
flowchart LR
  subgraph FE["frontend/ (npm, React Router 7 + Vite)"]
    App["app/"]
    OpenAPI["openapi/<br/>Orval codegen config"]
  end

  subgraph BE["backend/ (backend.sln, .NET 10)"]
    Api["src/backend.csproj<br/>ASP.NET Core Web API"]
    Agg["AggregateDatabaseHandler/<br/>console app"]
    Unit["tests/Backend.Tests<br/>xUnit + Moq + EF InMemory"]
    Integ["tests/Backend.IntegrationTests<br/>xUnit + Testcontainers"]
  end

  subgraph Infra["infra/ + docker-compose*.yml"]
    Db[("TimescaleDB / PostgreSQL<br/>infra/db, backend/seed")]
    Traefik["Traefik reverse proxy<br/>infra/traefik"]
  end

  Agg -- ProjectReference --> Api
  Unit -- ProjectReference --> Api
  Unit -- ProjectReference --> Agg
  Integ -- ProjectReference --> Api
  Integ -- ProjectReference --> Agg

  Api -. "openapi/v1.json" .-> OpenAPI
  OpenAPI -. "generates app/lib/api/generated" .-> App
  App -- "HTTP / JSON" --> Api
  Api -- EF Core / Npgsql --> Db
  Agg -- EF Core / Npgsql --> Db
```

| Unit | Path | Type | Purpose |
|---|---|---|---|
| Frontend | `frontend/` | React Router 7 SPA (TypeScript) | Dashboards for operators, foremen and management |
| Backend API | `backend/src/` | ASP.NET Core Web API | REST API for exposure, aggregate, note and user data |
| Aggregate handler | `backend/AggregateDatabaseHandler/` | .NET console app | Pre-computes aggregated exposure data into the aggregate database. Reuses the API project's `Data`, `Models` and `Utils` |
| Unit tests | `backend/tests/Backend.Tests/` | xUnit | Services, controllers and utilities against EF InMemory or mocks |
| Integration tests | `backend/tests/Backend.IntegrationTests/` | xUnit + Testcontainers | Services against a real PostgreSQL container |
| Infrastructure | `infra/`, `docker-compose*.yml` | Docker, Traefik | Local database and production deployment |

CI is split per unit in `.github/workflows/` (`frontend-ci.yml`, `backend-ci.yml`, `deploy.yml`).

## 2. Frontend module structure

`frontend/app/` follows a **routes → features → shared** layering. Path aliases (`@/features`, `@/components`, `@/ui`, `@/hooks`, `@/lib`, `@/i18n`) are defined in `frontend/tsconfig.json`.

```mermaid
flowchart TB
  Root["root.tsx + routes.ts<br/>app shell, providers, route table"]
  Routes["routes/<br/>operator/ · foreman/ · management/ · landing · register"]

  subgraph Features["features/ (vertical slices)"]
    direction TB
    Pages["Page-level features<br/>aggregated-exposure · management · user-details<br/>layout · sidebar · navbar · live"]
    Cards["Card / widget features<br/>exposure-line-chart-card · trend-line-chart-card<br/>live-exposure-card · attention-card · location-map<br/>day-widget · week-widget · calendar-widget<br/>security-regulations-card · statistic/summary cards"]
    Ctx["Cross-cutting context features<br/>user · views · date-picker · dark-mode · popups"]
    Pdf["pdf-export"]
    Pages --> Cards
    Pages --> Ctx
    Cards --> Ctx
  end

  Components["components/<br/>shared domain components"]
  UI["components/ui/<br/>design-system primitives (Radix / shadcn)"]
  Hooks["hooks/<br/>data + PDF hooks"]
  I18n["i18n/<br/>en / no locales"]

  subgraph Lib["lib/"]
    Core["lib/*.ts<br/>exposures, thresholds, danger-levels,<br/>dates, time buckets, plot export"]
    LibPdf["lib/pdf/"]
    ApiClient["lib/api/<br/>http-client.ts · invalidation.ts"]
    Gen["lib/api/generated/<br/>Orval: React Query hooks + Zod models"]
  end

  Root --> Routes
  Root --> Ctx
  Routes --> Features
  Routes --> Components
  Features --> Components
  Features --> Hooks
  Pdf --> LibPdf
  Components --> UI
  Components --> Hooks
  Hooks --> Core
  Features --> Core
  Features --> Gen
  Components --> Core
  Gen --> ApiClient
  Core --> ApiClient
  LibPdf --> Core
  Features & Components & Hooks & Core --> I18n
```

### Feature dependencies (measured)

The most connected features, by number of imports from other features:

| Feature | Depends on |
|---|---|
| `user-details` | `date-picker`, `day-widget`, `week-widget`, `exposure-line-chart-card`, `trend-line-chart-card`, `views`, statistic cards |
| `layout` | `user`, `popups`, `views`, `date-picker`, `dark-mode` |
| `exposure-line-chart-card` | `calendar-widget`, `week-widget`, statistic cards |
| `aggregated-exposure` | `location-map`, `views`, statistic cards |
| `management` | `aggregated-exposure` |
| `pdf-export` | `exposure-line-chart-card`, `user`, `views` + `lib/pdf` |

`user`, `views` and `date-picker` behave as **application-wide context**: almost everything reads the current user, the selected view (day/week/month) and the selected date from them.

## 3. Backend module structure

`backend/src/` is a classic layered ASP.NET Core project. Namespaces are `Backend.*`.

```mermaid
flowchart TB
  Program["Program.cs<br/>DI, CORS, auth, DbContexts"]
  MW["Middleware/<br/>SignedInUserMiddleware → SignedInUserContext"]
  Val["Validation/<br/>role auth handlers, field-for-exposure filter"]
  Ctrl["Controllers/<br/>Exposure · AggregateExposure · Note · User"]
  DTO["Controllers/DTOs/<br/>Exposure · Aggregate · Note · Sample · ThresholdStatus · User"]
  Svc["Services/<br/>ExposureData · AggregateExposureData · NoteData<br/>User · UserStatus · DatabaseSeeder"]
  Data["Data/<br/>AppDbContext · LoginDbContext · AggregateDbContext<br/>+ factories, Configurations/"]
  Models["Models/<br/>entities: User, Sample, Threshold, Location, *Average ..."]
  Records["Records/<br/>raw Dust/Noise/Vibration data"]
  Utils["Utils/<br/>Exposure, Threshold, TimeWindow, Authorization, Env"]
  Ext["Extensions/"]
  Mig["Migrations/ (EF Core)"]

  Program --> Ctrl & Svc & Data & MW & Val
  Ctrl --> Svc
  Ctrl --> DTO
  Ctrl --> Val
  Svc --> Data
  Svc --> DTO
  Svc --> Utils
  Svc --> MW
  Val --> MW
  Data --> Models
  Data --> Records
  DTO --> Models
  Utils --> Models
  Records --> Models
  Ext --> Models
  Mig --> Data

  Agg["AggregateDatabaseHandler<br/>DataFetchHandler · DataFiller · DataInsertHandler"]
  Agg --> Data
  Agg --> Models
  Agg --> Utils
```

Three databases are reached through separate `DbContext`s:

| DbContext | Config key | Holds |
|---|---|---|
| `AppDbContext` | `DATABASE_URL` | Operational exposure samples, notes, thresholds |
| `LoginDbContext` | `LOGIN_DATABASE_URL` | Users and roles |
| `AggregateDbContext` | `AGGREGATE_DATABASE_URL` | Pre-aggregated data written by `AggregateDatabaseHandler` |

## 4. API contract pipeline

The frontend never hand-writes request code for the backend. The contract flows from the C# controllers to a typed client:

```mermaid
flowchart LR
  C["Controllers + DTOs<br/>(C#)"] -->|"Microsoft.AspNetCore.OpenApi"| S["/openapi/v1.json"]
  S -->|"npm run api:fetch-spec"| J["frontend/openapi.json"]
  J -->|"openapi/corrections.ts<br/>(transformer)"| O["Orval<br/>npm run api:generate"]
  O -->|"openapi/postprocess.ts"| G["app/lib/api/generated/<br/>React Query hooks + Zod schemas"]
  G -->|"mutator"| H["app/lib/api/http-client.ts<br/>apiFetch + runtime Zod validation"]
```

`npm run api:check` regenerates the client and fails if it differs from the committed version, so a backend contract change that wasn't regenerated is caught in CI.

## 5. Dependency rules

These are the intended rules. The "Current exceptions" column lists the places where the code breaks a rule today.

| Rule | Current exceptions |
|---|---|
| **FE-1** `components/`, `hooks/` and `lib/` must not import from `features/` | `components/notes-card.tsx`, `components/notifications.tsx` → `features/user`, `views`, `date-picker`<br/>`components/exposure-level-card.tsx` → `features/attention-card`<br/>`hooks/use-exposure-chart-data.ts`, `hooks/use-exposure-trend-data.ts` → `features/user`, `views`, `date-picker`, `trend-line-chart-card`<br/>`hooks/use-export-pdf.ts` → `features/pdf-export`<br/>`lib/utils.ts`, `lib/api/http-client.ts` → `features/user` |
| **FE-2** `components/ui/` is pure presentation and imports nothing app-specific | None |
| **FE-3** Backend calls go through `lib/api/generated`, never raw `fetch` | None |
| **BE-1** Controllers → Services → Data. Controllers don't touch `DbContext` directly | None |
| **BE-2** `Models/` and `Data/` must not depend on `Controllers/DTOs` or `Services` | `Models/Threshold.cs` uses `Field` (DTOs)<br/>`Data/RequestContext.cs` uses `ExposureDataRequestDto`<br/>`Data/*DbContextFactory.cs` use `Services/DatabaseSeeder` |
| **BE-3** `Utils/` depends only on `Models/` | `Utils/ExposureUtils.cs`, `Utils/ThresholdUtils.cs` use `Field`, `TimeGranularity`, `AggregationFunction` (DTOs) |
| **BE-4** DTOs depend only on `Models/` | `UserDTOs/FullUserDto.cs` uses `FullUser` (defined in `Services/UserService.cs`) |

Most of these exceptions come from two sources, which can be fixed cheaply:

- **Frontend:** the user, view and date contexts are global app state but live in `features/`. Moving them to a shared location such as `app/context/` removes nearly all FE-1 violations.
- **Backend:** the enums `Field`, `TimeGranularity` and `AggregationFunction` are domain concepts but are declared inside `ExposureDataRequestDto.cs`. Moving them to `Models/` removes most BE-2 and BE-3 violations, and lets `AggregateDatabaseHandler` stop depending on the DTO namespace.

## 6. Keeping this view up to date

- Update the diagrams when a build unit, top-level folder or feature is added or removed.
- To enforce the rules automatically, consider:
  - Frontend: [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser) with a `forbidden` rule for `^app/(components|hooks|lib)` → `^app/features`. It can also generate the import graph (`depcruise app --output-type mermaid`).
  - Backend: [NetArchTest](https://github.com/BenMorris/NetArchTest) rules in `Backend.Tests` (for example, types in `Backend.Models` must not depend on `Backend.Controllers`).
