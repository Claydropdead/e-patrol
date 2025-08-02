-- Insert sample admin accounts for testing
INSERT INTO admin_accounts (id, rank, full_name, email, role, is_active) VALUES 
  (gen_random_uuid(), 'Police Colonel', 'Juan Carlos Santos', 'jc.santos@pnp.gov.ph', 'superadmin', true),
  (gen_random_uuid(), 'Police Major', 'Maria Elena Rodriguez', 'me.rodriguez@pnp.gov.ph', 'regional', true),
  (gen_random_uuid(), 'Police Captain', 'Roberto Miguel Cruz', 'rm.cruz@pnp.gov.ph', 'provincial', false),
  (gen_random_uuid(), 'Police Captain', 'Ana Sofia Reyes', 'as.reyes@pnp.gov.ph', 'station', true),
  (gen_random_uuid(), 'Police Major', 'Carlos Antonio Lopez', 'ca.lopez@pnp.gov.ph', 'provincial', true);

-- Insert sample personnel for testing
INSERT INTO personnel (id, rank, full_name, email, contact_number, province, unit, sub_unit, is_active) VALUES 
  (gen_random_uuid(), 'Police Officer III', 'Jose Antonio Dela Cruz', 'ja.delacruz@pnp.gov.ph', '+63 917 123 4567', 'Oriental Mindoro PPO', 'Oriental Mindoro PPO', 'Calapan CPS - Investigation Unit', true),
  (gen_random_uuid(), 'Police Officer II', 'Ana Marie Gonzales', 'am.gonzales@pnp.gov.ph', '+63 917 765 4321', 'Palawan PPO', 'Palawan PPO', 'Puerto Princesa CPS - Patrol Unit', true),
  (gen_random_uuid(), 'Police Officer I', 'Miguel Santos Fernando', 'ms.fernando@pnp.gov.ph', '+63 918 234 5678', 'Marinduque PPO', 'Marinduque PPO', 'Boac MPS - Traffic Unit', true),
  (gen_random_uuid(), 'Police Corporal', 'Elena Marie Valdez', 'em.valdez@pnp.gov.ph', '+63 919 345 6789', 'Romblon PPO', 'Romblon PPO', 'Romblon MPS - Investigation Unit', false),
  (gen_random_uuid(), 'Police Officer II', 'Ricardo Jose Mercado', 'rj.mercado@pnp.gov.ph', '+63 920 456 7890', 'Occidental Mindoro PPO', 'Occidental Mindoro PPO', 'Mamburao MPS - Patrol Unit', true),
  (gen_random_uuid(), 'Police Officer III', 'Carmen Rosa Silva', 'cr.silva@pnp.gov.ph', '+63 921 567 8901', 'Puerto Princesa CPO', 'Puerto Princesa CPO', 'Puerto Princesa CPS - Special Operations', true),
  (gen_random_uuid(), 'Police Senior Master Sergeant', 'Benjamin Carlos Torres', 'bc.torres@pnp.gov.ph', '+63 922 678 9012', 'RMFB', 'RMFB', 'Company A - Tactical Operations', true);
