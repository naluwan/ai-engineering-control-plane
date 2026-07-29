-- Creates the separate database used by the integration test suite.
--
-- Runs once, on first initialisation of an empty PostgreSQL data volume.
-- It creates a database and nothing else: no seed data, no application
-- tables — those come from Prisma migrations — and no credentials.
--
-- The integration suite deletes rows from this database. It must never point
-- at the application database.

CREATE DATABASE acp_test OWNER acp;
