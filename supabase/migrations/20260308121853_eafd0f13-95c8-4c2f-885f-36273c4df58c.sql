-- Push subscriptions table for storing user's web push endpoints
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions 
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- App settings table for VAPID keys (no public RLS = service role only)
CREATE TABLE app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
-- No RLS policies means only service_role can access this table