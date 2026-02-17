-- Create stores table for multi-vendor architecture
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tagline TEXT,
  logo TEXT,
  banner TEXT,
  description TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  total_revenue DECIMAL(12,2) DEFAULT 0.00,
  pending_payout DECIMAL(12,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);