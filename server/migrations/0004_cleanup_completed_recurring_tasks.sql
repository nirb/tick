-- Delete any legacy completed recurring tasks so only active recurring instances remain
DELETE FROM tasks WHERE status = 'completed' AND recurrence_rule IS NOT NULL AND recurrence_rule != '';
