-- Create enhanced cashback table with business logic
CREATE TABLE IF NOT EXISTS public.cashback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  status TEXT NOT NULL DEFAULT 'ELIGIBLE' CHECK (status IN ('ELIGIBLE', 'PENDING', 'PROCESSED', 'FAILED', 'EXPIRED')),
  processed_at TIMESTAMP WITH TIME ZONE,
  wallet_transaction_id UUID REFERENCES public.wallet_transactions(id),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id)
);

-- Create vendor settlements table for payout management
CREATE TABLE IF NOT EXISTS public.vendor_settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gross_amount DECIMAL(10,2) NOT NULL, -- Total order value for vendor products
  platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cashback_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_payout DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED')),
  processed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT, -- 'BANK_TRANSFER', 'UPI', 'PAYPAL'
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);