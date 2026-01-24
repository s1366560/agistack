-- Rollback initial schema migration
DROP INDEX IF EXISTS idx_permissions_workspace_id;
DROP INDEX IF EXISTS idx_api_keys_workspace_id;
DROP INDEX IF EXISTS idx_models_workspace_id;
DROP INDEX IF EXISTS idx_messages_session_id;
DROP INDEX IF EXISTS idx_sessions_project_id;
DROP INDEX IF EXISTS idx_projects_workspace_id;
DROP INDEX IF EXISTS idx_workspaces_user_id;
DROP INDEX IF EXISTS idx_users_email;

DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS models;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS users;
