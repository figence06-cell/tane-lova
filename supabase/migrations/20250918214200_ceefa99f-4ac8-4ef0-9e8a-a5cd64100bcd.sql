-- INSERT: kullanıcı kendi customer kaydıyla sipariş yaratabilsin
CREATE POLICY "orders.insert.customer_self"
ON public.orders
FOR INSERT TO authenticated
WITH CHECK (
  customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.user_id = auth.uid()
  )
);

-- SELECT: kullanıcı sadece kendi siparişlerini görebilsin
CREATE POLICY "orders.select.customer_self"
ON public.orders
FOR SELECT TO authenticated
USING (
  customer_id IN (
    SELECT c.id
    FROM public.customers c
    WHERE c.user_id = auth.uid()
  )
);
