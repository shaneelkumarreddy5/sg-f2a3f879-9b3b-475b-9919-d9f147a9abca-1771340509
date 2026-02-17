import { supabase } from '../integrations/supabase/client'
import type { Database } from '../integrations/supabase/types'

// Type definitions for vendor operations
type Store = Database['public']['Tables']['stores']['Row']
type Order = Database['public']['Tables']['orders']['Row']
type VendorSettlement = Database['public']['Tables']['vendor_settlements']['Row']
type Product = Database['public']['Tables']['products']['Row']

// Glonni Vendor Service - Multi-vendor marketplace logic
export const vendorService = {
  // Create vendor store (requires approval)
  async createStore(storeData: {
    userId: string
    name: string
    description: string
    slug: string
    logo?: string
    banner?: string
    address?: Record<string, unknown>
    contact?: Record<string, unknown>
    settings?: Record<string, unknown>
  }): Promise<Store> {
    const { data, error } = await supabase
      .from('stores')
      .insert({
        user_id: storeData.userId,
        name: storeData.name,
        description: storeData.description,
        slug: storeData.slug,
        logo: storeData.logo || null,
        banner: storeData.banner || null,
        address: storeData.address ? JSON.stringify(storeData.address) : null,
        contact: storeData.contact ? JSON.stringify(storeData.contact) : null,
        settings: storeData.settings || {},
        is_approved: false // Requires admin approval
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get vendor's store
  async getVendorStore(userId: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Get vendor's products
  async getVendorProducts(userId: string): Promise<Product[]> {
    // First get vendor's store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!store) return []

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(name, slug),
        order_items(quantity, price)
      `)
      .eq('store_id', store.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get vendor's orders (only orders containing their products)
  async getVendorOrders(userId: string): Promise<Order[]> {
    // Get vendor's store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (!store) return []

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles(full_name, email),
        order_items(
          quantity,
          price,
          products!inner(
            store_id,
            name,
            images
          )
        )
      `)
      .eq('order_items.products.store_id', store.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get vendor settlements (payouts)
  async getVendorSettlements(userId: string): Promise<VendorSettlement[]> {
    const { data, error } = await supabase
      .from('vendor_settlements')
      .select(`
        *,
        orders(order_number, total_amount, created_at),
        stores(name, slug)
      `)
      .eq('vendor_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Calculate vendor earnings
  async calculateVendorEarnings(userId: string): Promise<{
    totalRevenue: number
    pendingPayouts: number
    paidPayouts: number
    commissionPaid: number
  }> {
    const { data, error } = await supabase
      .from('vendor_settlements')
      .select('gross_amount, net_payout, platform_commission, status')
      .eq('vendor_id', userId)
    
    if (error) throw error

    const earnings = {
      totalRevenue: 0,
      pendingPayouts: 0,
      paidPayouts: 0,
      commissionPaid: 0
    }

    data?.forEach(settlement => {
      earnings.totalRevenue += settlement.gross_amount
      earnings.commissionPaid += settlement.platform_commission
      
      switch (settlement.status) {
        case 'PENDING':
          earnings.pendingPayouts += settlement.net_payout
          break
        case 'PAID':
          earnings.paidPayouts += settlement.net_payout
          break
      }
    })

    return earnings
  },

  // Update order status (vendor can update their own orders)
  async updateOrderStatus(orderId: string, status: string, vendorId: string, notes?: string): Promise<boolean> {
    // Get vendor's store
    const { data: store } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', vendorId)
      .single()

    if (!store) throw new Error('Vendor store not found')

    // Verify this order contains vendor's products
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          products!inner(
            store_id
          )
        )
      `)
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) throw new Error('Order not found')
    
    // Check if order contains vendor's products
    const hasVendorProducts = order.order_items?.some(
      item => item.products?.store_id === store.id
    )
    
    if (!hasVendorProducts) {
      throw new Error('Not authorized to update this order')
    }

    // Update order status
    const { data, error } = await supabase
      .rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: status,
        p_admin_notes: notes || null
      })
    
    if (error) throw error
    return data || false
  },

  // Request payout (vendor can request when eligible)
  async requestPayout(settlementId: string, vendorId: string): Promise<VendorSettlement> {
    const { data, error } = await supabase
      .from('vendor_settlements')
      .update({ 
        status: 'PROCESSING',
        updated_at: new Date().toISOString()
      })
      .eq('id', settlementId)
      .eq('vendor_id', vendorId)
      .eq('status', 'PENDING')
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get vendor dashboard statistics
  async getVendorStats(userId: string): Promise<{
    totalProducts: number
    activeProducts: number
    totalOrders: number
    pendingOrders: number
    deliveredOrders: number
    totalRevenue: number
    averageRating: number
  }> {
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('id, rating')
      .eq('user_id', userId)
      .single()
    
    if (storeError) {
      throw storeError.error || new Error('Failed to get vendor store')
    }

    if (!storeData) {
      return {
        totalProducts: 0,
        activeProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        totalRevenue: 0,
        averageRating: 0
      }
    }

    // Get products count
    const { data: products } = await supabase
      .from('products')
      .select('is_active')
      .eq('store_id', storeData.id)
    
    // Get orders count
    const { data: orders } = await supabase
      .from('orders')
      .select('order_status')
      .like('order_items', '%store_id":"' + storeData.id + '"%')

    const stats = {
      totalProducts: products?.length || 0,
      activeProducts: products?.filter(p => p.is_active).length || 0,
      totalOrders: orders?.length || 0,
      pendingOrders: orders?.filter(o => o.order_status === 'PAID' || o.order_status === 'SHIPPED').length || 0,
      deliveredOrders: orders?.filter(o => o.order_status === 'DELIVERED').length || 0,
      totalRevenue: 0,
      averageRating: storeData.rating || 0
    }

    return stats
  }
}