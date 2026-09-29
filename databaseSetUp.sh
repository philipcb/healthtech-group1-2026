#!/bin/bash
# This script setup the database : it requires to have docker installed, as well as ef core

#exit when a command fails
set -e 

#load env variable
set -a 
source ./backend/.env
set +a

echo "------ start db container" 

docker compose --env-file ./backend/.env up -d db

DB_CONTAINER=$(docker compose --env-file ./backend/.env ps -q db)
until [ "$(docker inspect -f '{{.State.Health.Status}}' "$DB_CONTAINER")" = "healthy" ]; do
    sleep 1
done
echo "------db container ready for connection"

echo "------create login database"
docker exec -it healthtech-dev-db-1 psql -U postgres -d healthtech -c "CREATE USER "$LOGIN_USER" WITH PASSWORD '$LOGIN_PASSWORD'" 
docker exec -it healthtech-dev-db-1 psql -U postgres -d healthtech -c "CREATE DATABASE "$LOGIN_DB" OWNER "$LOGIN_USER"" 
echo "------database and user created"
#Migrations
cd ./backend

echo "------start migrations"
dotnet ef database update --project src --context AppDbContext
dotnet ef database update --project src --context LoginDbContext
echo "------migrations succeeded"

#put initial values for exposure
echo "------start seeding"
docker exec -it healthtech-dev-db-1 psql -U postgres -d healthtech -f /seed/seed.sql
echo "------seeding succeeded"

cd ..

echo "------Database set up with success!"
echo "------Now, whenever you want to start the db, use docker compose --env-file ./backend/.env up -d db"