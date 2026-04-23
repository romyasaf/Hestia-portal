-- Default admin user for local development
-- Email: admin@propertyops.qa
-- Password: Admin123!
-- Roles: super_admin + admin (dev convenience)

WITH inserted_user AS (
  INSERT INTO users (email, password_hash, full_name, is_active)
  VALUES (
    'admin@propertyops.qa',
    crypt('Admin123!', gen_salt('bf')),
    'Platform Admin',
    true
  )
  ON CONFLICT (email) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        is_active = true
  RETURNING id
),
resolved_user AS (
  SELECT id FROM inserted_user
  UNION ALL
  SELECT id FROM users WHERE email = 'admin@propertyops.qa'
  LIMIT 1
)
INSERT INTO user_roles (user_id, role_id)
SELECT ru.id, r.id
FROM resolved_user ru
JOIN roles r ON r.code IN ('super_admin', 'admin')
ON CONFLICT (user_id, role_id) DO NOTHING;
