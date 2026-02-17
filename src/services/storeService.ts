import { supabase } from '../integrations/supabase/client'
import type { Database } from '../integrations/supabase/types'
import type { Json } from "database.types";

// Type definitions for better type safety
type Store = Database['public']['Tables']['stores']['Row']
type Product = Database['public']['Tables']['products']['Row']
type Category = Database['public']['Tables']['categories']['Row']
type CartItem = Database['public']['Tables']['cart_items']['Row']
type Order = Database['public']['Tables']['orders']['Row']

// Glonni Store Service - Multi-vendor E-commerce Logic
export const storeService = {
  // Store management for multi-vendor architecture
  async createStore(storeData: Omit<Store, 'id' | 'created_at' | 'updated_at' | 'rating' | 'total_revenue' | 'pending_payout'>) {
    const { data, error } = await supabase
      .from('stores')
      .insert([storeData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getUserStore(userId: string): Promise<Store | null> {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Product management with vendor ownership
  async createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'rating' | 'reviews_count' | 'total_sales'>) {
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async getStoreProducts(storeId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getApprovedProducts(limit = 50): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories(name, slug, icon),
        stores(name, slug, logo, rating)
      `)
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  },

  // Cart management (user-specific)
  async addToCart(userId: string, productId: string, quantity: number, variantId?: string) {
    // Check if item already exists in cart
    const { data: existingItem } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('variant_id', variantId || null)
      .single()
    
    if (existingItem) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('id', existingItem.id)
        .select()
        .single()
      
      if (error) throw error
      return data
    } else {
      // Add new item
      const { data, error } = await supabase
        .from('cart_items')
        .insert([{
          user_id: userId,
          product_id: productId,
          variant_id: variantId || null,
          quantity
        }])
        .select()
        .single()
      
      if (error) throw error
      return data
    }
  },

  async getUserCart(userId: string): Promise<(CartItem & { products: Product })[]> {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products(*, categories(name, slug), stores(name, slug))
      `)
      .eq('user_id', userId)
    
    if (error) throw error
    
    // Filter out null products and properly type
    return (data?.filter(item => item.products !== null).map(item => ({
      ...item,
      products: item.products! // Non-null assertion since we filtered
    })) || []) as (CartItem & { products: Product })[]
  },

  async removeFromCart(userId: string, cartItemId: string) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', cartItemId)
      .eq('user_id', userId)
    
    if (error) throw error
  },

  // Order management with Glonni business logic
  async createOrder(orderData: {
    user_id: string
    items: Array<{product_id: string; variant_id?: string; quantity: number; price: number; store_id: string}>
    total_amount: number
    shipping_address: Record<string, unknown>
    billing_address?: Record<string, unknown>
    payment_method?: 'COD' | 'ONLINE'
  }) {
    // Create order using database function for proper stock validation
    const { data, error } = await supabase
      .rpc('create_order', {
        p_user_id: orderData.user_id,
        p_items: orderData.items as unknown as Json,
        p_total_amount: orderData.total_amount,
        p_shipping_address: orderData.shipping_address as Json,
        p_billing_address: orderData.billing_address as Json || null,
        p_payment_method: orderData.payment_method || 'COD'
      })
    
    if (error) throw error
    return data
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Admin functions for approval workflows
  async getPendingStores(): Promise<Store[]> {
    const { data, error } = await supabase
      .from('stores')
      .select('*, profiles(email, full_name)')
      .eq('is_approved', false)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async getPendingProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        stores(name, slug, logo),
        categories(name, slug)
      `)
      .eq('is_approved', false)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  async approveStore(storeId: string) {
    const { data, error } = await supabase
      .from('stores')
      .update({ is_approved: true })
      .eq('id', storeId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async approveProduct(productId: string) {
    const { data, error } = await supabase
      .from('products')
      .update({ is_approved: true })
      .eq('id', productId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) throw error
    return data || []
  }
}