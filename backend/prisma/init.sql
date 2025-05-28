-- Initialize database with extensions and initial data
SELECT 'CREATE DATABASE research_db'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'research_db')\gexec

-- Connect to the database
\c research_db;


-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE research_db TO admin;
