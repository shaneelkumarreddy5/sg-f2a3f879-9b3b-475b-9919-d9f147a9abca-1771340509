-- Create Glonni wallet table for cashback management
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0.00,
  total_cashback DECIMAL(10,2) DEFAULT 0.00,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create wallet transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  reference_id UUID, -- Can reference order_id, cashback_id, etc.
  reference_type TEXT, -- 'ORDER', 'CASHBACK', 'WITHDRAWAL'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);