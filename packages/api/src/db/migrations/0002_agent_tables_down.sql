-- Rollback agent tables migration
-- Drop indexes first
DROP INDEX IF EXISTS idx_agent_tools_enabled;
DROP INDEX IF EXISTS idx_agent_tools_category;
DROP INDEX IF EXISTS idx_agent_tool_usage_tool_name;
DROP INDEX IF EXISTS idx_agent_tool_usage_execution_id;
DROP INDEX IF EXISTS idx_agent_executions_agent_type;
DROP INDEX IF EXISTS idx_agent_executions_state;
DROP INDEX IF EXISTS idx_agent_executions_session_id;

-- Drop tables (in correct order due to foreign keys)
DROP TABLE IF EXISTS agent_tool_usage;
DROP TABLE IF EXISTS agent_tools;
DROP TABLE IF EXISTS agent_executions;
