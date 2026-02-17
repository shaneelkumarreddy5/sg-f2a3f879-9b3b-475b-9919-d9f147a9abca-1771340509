-- Enable RLS for new tables
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_settlements ENABLE ROW LEVEL SECURITY;

-- Wallet RLS policies
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Admins can manage all wallets" ON public.wallets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Wallet transactions RLS policies
CREATE POLICY "Users can view their own wallet transactions" ON public.wallet_transactions FOR SELECT USING (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can view all wallet transactions" ON public.wallet_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Admins can manage all wallet transactions" ON public.wallet_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- Vendor settlements RLS policies
CREATE POLICY "Vendors can view their own settlements" ON public.vendor_settlements FOR SELECT USING (vendor_id = auth.uid());
CREATE POLICY "Admins can view all settlements" ON public.vendor_settlements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
CREATE POLICY "Admins can manage all settlements" ON public.vendor_settlements FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);