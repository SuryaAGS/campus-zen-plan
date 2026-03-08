
-- Enable the pg_cron and pg_net extensions for scheduled HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the send-task-reminders edge function to run every 15 minutes
SELECT cron.schedule(
  'send-task-reminders-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lnnwmfmjiitrgsmipzvs.supabase.co/functions/v1/send-task-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubndtZm1qaWl0cmdzbWlwenZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTAwMTQsImV4cCI6MjA4ODQ4NjAxNH0.VAy8Sy7IbFMSswzfshuNmCdgou-gACFJpSTNcRl9lKs'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
