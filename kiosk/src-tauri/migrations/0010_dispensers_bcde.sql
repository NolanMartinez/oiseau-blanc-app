-- Frigos B..E : jusqu'à 5 cartes (frigos) par borne.
-- Désactivés par défaut (à activer/configurer dans Liaisons), 32 casiers chacun.
INSERT OR IGNORE INTO dispensers (board, com_port, box_count, enabled) VALUES
  ('B', '', 32, 0),
  ('C', '', 32, 0),
  ('D', '', 32, 0),
  ('E', '', 32, 0);

-- 32 casiers vides pour chacun des nouveaux dispensers.
WITH RECURSIVE seq(n) AS (
  SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < 32
)
INSERT OR IGNORE INTO lockers (board, box_number, state)
SELECT b.board, seq.n, 'idle'
FROM (SELECT 'B' AS board UNION ALL SELECT 'C' UNION ALL SELECT 'D' UNION ALL SELECT 'E') b, seq;
