# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy csproj files and restore dependencies (cached layer)
COPY src/*.csproj ./src/
COPY AggregateDatabaseHandler/*.csproj ./AggregateDatabaseHandler/
RUN dotnet restore src/*.csproj -r linux-x64
# The handler references the backend project, so this restores both
RUN dotnet restore AggregateDatabaseHandler/*.csproj -r linux-x64

# Copy the rest of the source code
COPY . .

# Install Dotnet EF to bundle it later
RUN dotnet tool install --global dotnet-ef --version 10.*
ENV PATH="$PATH:/root/.dotnet/tools"

# Build
WORKDIR /app/src
RUN dotnet build *.csproj -c Release --no-restore

# Create one EF Core bundle per DbContext. Bundles are self-contained executables that run
# migrations without needing the .NET SDK in the final image. --context is required because
# the project has several DbContexts.
RUN dotnet ef migrations bundle --context AppDbContext --self-contained -r linux-x64 --configuration Release -o /app/out/efbundle-app --no-build
RUN dotnet ef migrations bundle --context LoginDbContext --self-contained -r linux-x64 --configuration Release -o /app/out/efbundle-login --no-build
RUN dotnet ef migrations bundle --context AggregateDbContext --self-contained -r linux-x64 --configuration Release -o /app/out/efbundle-aggregate --no-build

# Publish the backend
RUN dotnet publish *.csproj -c Release -r linux-x64 -o /app/out --no-restore --self-contained

# Publish the one-shot job that fills the aggregate database
WORKDIR /app
RUN dotnet publish AggregateDatabaseHandler/*.csproj -c Release -r linux-x64 -o /app/out/aggregate-handler --self-contained

# Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

COPY --from=build /app/out .

# Make the efbundles executable
RUN chmod +x ./efbundle-app ./efbundle-login ./efbundle-aggregate

EXPOSE 8080
ENTRYPOINT ["dotnet", "backend.dll"]
