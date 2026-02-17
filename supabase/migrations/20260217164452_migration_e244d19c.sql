-- Product variants RLS policies
CREATE POLICY "Public can view product variants" ON public.product_variants FOR SELECT USING (
  product_id IN (SELECT id FROM public.products WHERE is_approved = true AND is_active = true)
);
CREATE POLICY "Store owners can manage their own product variants" ON public.product_variants FOR ALL USING (
  product_id IN (
    SELECT id FROM public.products 
    WHERE store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid())
  )
);
CREATE POLICY "Admins can manage all product variants" ON public.product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
);