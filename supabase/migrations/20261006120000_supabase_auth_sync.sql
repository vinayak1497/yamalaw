-- YamaLaw Supabase Auth sync migration
-- Automatically syncs auth.users created/updated by Supabase Auth into public.users and role profiles.

-- 1. Allow password_hash to be empty/null for Supabase Auth users (passwords are handled by auth.users)
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN password_hash SET DEFAULT '';

-- 2. Trigger function to sync new/updated auth.users to public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
  v_phone TEXT;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'CITIZEN');
  IF v_role NOT IN ('CITIZEN', 'LAWYER', 'JUDGE', 'POLICE', 'ADMIN') THEN
    v_role := 'CITIZEN';
  END IF;

  v_full_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_phone := COALESCE(new.raw_user_meta_data->>'phone', '');

  -- Insert or update in public.users
  INSERT INTO public.users (id, email, password_hash, full_name, role, phone, language, is_demo)
  VALUES (
    new.id::text,
    LOWER(new.email),
    '',
    v_full_name,
    v_role,
    v_phone,
    'en',
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN public.users.full_name IS NULL OR public.users.full_name = '' THEN EXCLUDED.full_name ELSE public.users.full_name END,
    role = CASE WHEN public.users.role IS NULL THEN EXCLUDED.role ELSE public.users.role END,
    phone = CASE WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone ELSE public.users.phone END;

  -- Create corresponding profile based on role
  IF v_role = 'CITIZEN' THEN
    INSERT INTO public.citizen_profiles (user_id) VALUES (new.id::text) ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'LAWYER' THEN
    INSERT INTO public.lawyer_profiles (user_id) VALUES (new.id::text) ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'JUDGE' THEN
    INSERT INTO public.judge_profiles (user_id) VALUES (new.id::text) ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_role = 'POLICE' THEN
    INSERT INTO public.police_profiles (user_id) VALUES (new.id::text) ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF raw_user_meta_data, email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Enable Row Level Security and add policies for public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view users" ON public.users;
CREATE POLICY "Public can view users" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id OR auth.role() = 'service_role');

-- Enable RLS and policies for profiles as well
ALTER TABLE public.citizen_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select citizen_profiles" ON public.citizen_profiles;
CREATE POLICY "Allow select citizen_profiles" ON public.citizen_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow update own citizen_profiles" ON public.citizen_profiles;
CREATE POLICY "Allow update own citizen_profiles" ON public.citizen_profiles FOR ALL USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

ALTER TABLE public.lawyer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select lawyer_profiles" ON public.lawyer_profiles;
CREATE POLICY "Allow select lawyer_profiles" ON public.lawyer_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow update own lawyer_profiles" ON public.lawyer_profiles;
CREATE POLICY "Allow update own lawyer_profiles" ON public.lawyer_profiles FOR ALL USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

ALTER TABLE public.judge_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select judge_profiles" ON public.judge_profiles;
CREATE POLICY "Allow select judge_profiles" ON public.judge_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow update own judge_profiles" ON public.judge_profiles;
CREATE POLICY "Allow update own judge_profiles" ON public.judge_profiles FOR ALL USING (auth.uid()::text = user_id OR auth.role() = 'service_role');

ALTER TABLE public.police_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select police_profiles" ON public.police_profiles;
CREATE POLICY "Allow select police_profiles" ON public.police_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow update own police_profiles" ON public.police_profiles;
CREATE POLICY "Allow update own police_profiles" ON public.police_profiles FOR ALL USING (auth.uid()::text = user_id OR auth.role() = 'service_role');
