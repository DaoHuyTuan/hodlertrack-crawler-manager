-- Initialize database for hodlertrack-crawler
-- This file will be executed when the PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- Grant permissions to hodler user
GRANT ALL PRIVILEGES ON DATABASE hodler TO hodler;

-- You can add any additional initialization SQL here
-- For example, creating additional schemas, users, or initial data
