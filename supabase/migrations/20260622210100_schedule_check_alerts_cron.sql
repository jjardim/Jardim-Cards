SELECT cron.schedule(
  'check-alerts-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://aubjiqmnfbtmkfhwlbkp.supabase.co/functions/v1/check-alerts',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
