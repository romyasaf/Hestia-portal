INSERT INTO roles (code, name) VALUES
  ('super_admin', 'Super Administrator'),
  ('admin', 'Administrator'),
  ('staff', 'Staff'),
  ('tenant', 'Tenant'),
  ('owner', 'Property Owner'),
  ('client', 'Contracting Client')
ON CONFLICT (code) DO NOTHING;
