-- db/views.sql — run AFTER schema.sql + schema_tasters.sql,
-- and re-run after every `prisma migrate deploy` (Prisma doesn't own views).
-- The API reads ONLY these views for user-facing content (approved rows).

CREATE OR REPLACE VIEW live_questions AS
  SELECT * FROM questions WHERE status = 'approved';

CREATE OR REPLACE VIEW live_resources AS
  SELECT * FROM resources WHERE status = 'approved';

CREATE OR REPLACE VIEW live_concepts AS
  SELECT * FROM concepts WHERE status = 'approved';

CREATE OR REPLACE VIEW live_tasters AS
  SELECT * FROM taster_projects WHERE status = 'approved';

CREATE OR REPLACE VIEW live_events AS
  SELECT * FROM events WHERE status = 'approved';

CREATE OR REPLACE VIEW live_certifications AS
  SELECT * FROM certifications WHERE status = 'approved';

CREATE OR REPLACE VIEW live_project_suggestions AS
  SELECT * FROM project_suggestions WHERE status = 'approved';

CREATE OR REPLACE VIEW leaderboard AS
  SELECT u.id, u.display_name, COALESCE(SUM(p.points), 0) AS total_points
  FROM users u LEFT JOIN point_events p ON p.user_id = u.id
  GROUP BY u.id ORDER BY total_points DESC;

-- Inputs to fitScore(): averages per user+field over reviewed tasters
CREATE OR REPLACE VIEW field_fit_inputs AS
  SELECT ut.user_id,
         tp.field_id,
         COUNT(*)                    AS tasters_done,
         AVG(ut.enjoyment)           AS avg_enjoyment,   -- 1..5
         AVG(ut.performance)         AS avg_performance, -- 0..1
         AVG(ut.would_continue::int) AS would_continue_rate
  FROM user_tasters ut
  JOIN taster_projects tp ON tp.id = ut.taster_id
  WHERE ut.status = 'reviewed' AND ut.enjoyment IS NOT NULL
  GROUP BY ut.user_id, tp.field_id;
