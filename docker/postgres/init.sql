-- AgiStack PostgreSQL Initialization Script

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for better performance
-- Note: These will be created by Drizzle migrations
-- This script is mainly for any initial database setup

-- Grant permissions (if needed)
-- GRANT ALL PRIVILEGES ON DATABASE agistack TO agistack;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'AgiStack database initialized successfully';
END $$;
