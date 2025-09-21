import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Package, Search, ShoppingCart, User, Calendar, DollarSign } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: {
    id: string;
    name: string;
  } | null;
}

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  customers: {
    customer_name: string;
    phone: string;
  } | null;
  order_items: OrderItem[];
}

export const SupplierOrdersPage = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierData, setSupplierData] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // ---------------------------
  // Siparişleri tedarikçiye göre çek
  // ---------------------------
  const fetchOrders = async () => {
    if (!supplierData) return;
    setLoading(true);

    try {
      // Bu tedarikçinin ürünlerine ait order_items'ları çekiyoruz
      const { data: items, error } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          quantity,
          unit_price,
          total_price,
          products!inner (
            id,
            name,
            supplier_id
          ),
          orders!inner (
            id,
            status,
            total_amount,
            created_at,
            customers (
              customer_name,
              phone
            )
          )
        `)
        .eq('products.supplier_id', supplierData.id)                 // 🔑 supplier filtresi
        .order('orders(created_at)', { ascending: false });          // sipariş tarihine göre sırala

      if (error) throw error;

      // items -> orders yapısına dönüştür (tek siparişte birden çok item olabilir)
      const map = new Map<string, Order>();
      for (const it of items || []) {
        const o = (it as any).orders as Order | undefined;
        if (!o) continue;

        if (!map.has(o.id)) {
          map.set(o.id, {
            id: o.id,
            status: (o as any).status,
            total_amount: (o as any).total_amount,
            created_at: (o as any).created_at,
            customers: (o as any).customers ?? null,
            order_items: [],
          });
        }

        const current = map.get(o.id)!;
        current.order_items.push({
          id: it.id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: it.total_price,
          products: (it as any).products
            ? { id: (it as any).products.id, name: (it as any).products.name }
            : null,
        });
      }

      setOrders(Array.from(map.values()));
    } catch (err: any) {
      toast({
        title: 'Hata',
        description: 'Siparişler yüklenirken bir hata oluştu: ' + err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Supplier bilgisini çek
  // ---------------------------
  useEffect(() => {
    const fetchSupplierData = async () => {
      if (!user) return;

      const { data: supplier, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        toast({
          title: 'Hata',
          description: 'Tedarikçi bilgisi alınamadı: ' + error.message,
          variant: 'destructive',
        });
        return;
      }

      setSupplierData(supplier);
    };

    fetchSupplierData();
  }, [user, toast]);

  // ---------------------------
  // Supplier gelince siparişleri çek
  // ---------------------------
  useEffect(() => {
    if (supplierData) {
      fetchOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierData]);

  // ---------------------------
  // Arama filtresi (null-safe)
  // ---------------------------
  const safeIncludes = (val: string | undefined | null, term: string) =>
    (val ?? '').toLowerCase().includes(term.toLowerCase());

  const filteredOrders = orders.filter((order) => {
    const customerMatch = safeIncludes(order.customers?.customer_name, searchTerm);
    const productMatch = order.order_items?.some((item) =>
      safeIncludes(item.products?.name, searchTerm)
    );
    return customerMatch || productMatch;
  });

  // ---------------------------
  // Status güncelleme (tedarikçi)
  // ---------------------------
  const STATUS_OPTIONS = [
    { value: 'pending',   label: 'Beklemede' },
    { value: 'confirmed', label: 'Onaylandı' },
    { value: 'shipped',   label: 'Dağıtıma Çıktı' },
    { value: 'delivered', label: 'Teslim Edildi' },
    { value: 'cancelled', label: 'İptal Edildi' },
  ];

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Optimistic UI
    const prev = orders;
    setOrders((curr) => curr.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);

    if (error) {
      // geri al
      setOrders(prev);
      toast({
        title: 'Hata',
        description: 'Durum güncellenemedi: ' + error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Güncellendi', description: 'Sipariş durumu güncellendi.' });
    }
  };

  // ---------------------------
  // Görsel yardımcılar
  // ---------------------------
  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending:   { label: 'Beklemede',     variant: 'secondary' as const },
      confirmed: { label: 'Onaylandı',     variant: 'default'   as const },
      shipped:   { label: 'Dağıtıma Çıktı',variant: 'outline'   as const },
      delivered: { label: 'Teslim Edildi', variant: 'default'   as const },
      cancelled: { label: 'İptal Edildi',  variant: 'destructive' as const },
    };
    return statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
  };

  const getSupplierItemsTotal = (orderItems: OrderItem[]) => {
    return (orderItems || []).reduce((total, item) => total + (item?.total_price ?? 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-muted-foreground">Siparişler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Siparişlerim</h1>
          <p className="text-muted-foreground">Ürünlerinize ait siparişleri buradan takip edebilirsiniz</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Aktif Siparişler ({filteredOrders.length})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sipariş ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {orders.length === 0 ? 'Henüz sipariş bulunmuyor' : 'Arama kriterinize uygun sipariş bulunamadı'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="p-4 border border-border rounded-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold text-foreground">
                          Sipariş #{order.id.slice(0, 8)}
                        </h3>

                        {/* Rozet */}
                        <Badge {...getStatusBadge(order.status)}>
                          {getStatusBadge(order.status).label}
                        </Badge>

                        {/* Durum değiştirici (tedarikçi güncelleyebilir) */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Durum:</span>
                          <select
                            className="border rounded-md px-2 py-1 bg-background"
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {order.customers && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{order.customers.customer_name}</span>
                          <span>•</span>
                          <span>{order.customers.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(order.created_at).toLocaleDateString('tr-TR')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>₺{getSupplierItemsTotal(order.order_items).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Ürünlerim ({order.order_items.length})
                    </h4>
                    <div className="grid gap-2">
                      {order.order_items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{item.products?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity} adet × ₺{item.unit_price}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">₺{item.total_price.toFixed(2)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
