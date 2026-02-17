import { supabase } from '../integrations/supabase/client'
import type { Database } from '../integrations/supabase/types'
import { cashbackService } from './cashbackService'
import { walletService } from './walletService'

// Type definitions for order operations
type Order = Database['public']['Tables']['orders']['Row']
type CartItem = Database['public']['Tables']['cart_items']['Row']
type Product = Database['public']['Tables']['products']['Row']

// Glonni Order Service - Complete order lifecycle with cashback integration
export const orderService = {
  // Create order from cart with Glonni business logic
  async createOrderFromCart(
    userId: string, 
    shippingAddress: Record<string, unknown>, 
    billingAddress?: Record<string, unknown>, 
    paymentMethod: 'COD' | 'ONLINE' = 'COD'
  ): Promise<{ orderId: string; orderNumber: string }> {
    // Get user's cart
    const cartItems = await this.getUserCart(userId)
    
    if (!cartItems || cartItems.length === 0) {
      throw new Error('Cart is empty')
    }

    // Check stock and prepare order items
    const orderItems = []
    let totalAmount = 0

    for (const cartItem of cartItems) {
      const product = cartItem.products
      if (!product) {
        throw new Error(`Product not found for cart item ${cartItem.id}`)
      }

      // Check stock
      if (product.stock < cartItem.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${cartItem.quantity}`)
      }

      // Prepare order item
      orderItems.push({
        product_id: cartItem.product_id,
        variant_id: cartItem.variant_id,
        quantity: cartItem.quantity,
        price: product.selling_price,
        store_id: product.store_id
      })

      totalAmount += product.selling_price * cartItem.quantity
    }

    // Create order using database function (handles stock validation)
    const { data, error } = await supabase
      .rpc('create_order', {
        p_user_id: userId,
        p_items: orderItems,
        p_total_amount: totalAmount,
        p_shipping_address: shippingAddress,
        p_billing_address: billingAddress || null,
        p_payment_method: paymentMethod
      })
    
    if (error) throw error

    // Clear cart after successful order creation
    await this.clearCart(userId)

    return {
      orderId: data[0].order_id,
      orderNumber: data[0].order_number
    }
  },

  // Get user orders with full details
  async getUserOrders(userId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles(full_name, email),
        cashback(id, amount, status, processed_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get order details
  async getOrderDetails(orderId: string, userId?: string): Promise<Order | null> {
    let query = supabase
      .from('orders')
      .select(`
        *,
        profiles(full_name, email),
        cashback(id, amount, status, processed_at),
        vendor_settlements(
          id,
          status,
          net_payout,
          stores(name, slug)
        )
      `)
      .eq('id', orderId)
    
    // If userId provided, ensure user owns the order
    if (userId) {
      query = query.eq('user_id', userId)
    }
    
    const { data, error } = await query.single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Update order status (admin/vendor function)
  async updateOrderStatus(orderId: string, status: 'CREATED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED', adminNotes?: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('update_order_status', {
        p_order_id: orderId,
        p_new_status: status,
        p_admin_notes: adminNotes || null
      })
    
    if (error) throw error
    return data || false
  },

  // Confirm delivery and trigger cashback processing
  async confirmDelivery(orderId: string): Promise<boolean> {
    // Update order status to delivered
    const success = await this.updateOrderStatus(orderId, 'DELIVERED', 'Delivery confirmed')
    
    if (success) {
      // Process cashback automatically (Glonni USP: instant cashback after delivery)
      await cashbackService.processCashbackForOrder(orderId)
    }
    
    return success
  },

  // Get user's cart items
  async getUserCart(userId: string): Promise<(CartItem & { products: Product })[]> {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        products(*, categories(name, slug), stores(name, slug, logo))
      `)
      .eq('user_id', userId)
    
    if (error) throw error
    return data || []
  },

  // Clear user cart
  async clearCart(userId: string): Promise<void> {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
    
    if (error) throw error
  },

  // Use wallet balance for order payment
  async payWithWallet(userId: string, orderId: string, amount: number): Promise<boolean> {
    try {
      const success = await walletService.useWalletBalance(userId, orderId, amount)
      
      if (success) {
        // Update order status to paid
        await this.updateOrderStatus(orderId, 'PAID', 'Paid with wallet balance')
      }
      
      return success
    } catch (error) {
      throw new Error('Wallet payment failed: ' + error.message)
    }
  },

  // Check if user can use wallet for order
  async canUseWallet(userId: string, amount: number): Promise<boolean> {
    return await walletService.hasSufficientBalance(userId, amount)
  },

  // Get order statistics for admin
  async getOrderStats(): Promise<{
    totalOrders: number
    revenue: number
    pendingOrders: number
    deliveredOrders: number
    cancelledOrders: number
    cashbackPaid: number
  }> {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_status, total_amount, cashback_given')
    
    if (error) throw error

    const stats = {
      totalOrders: orders?.length || 0,
      revenue: 0,
      pendingOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      cashbackPaid: 0
    }

    orders?.forEach(order => {
      stats.revenue += order.total_amount
      
      switch (order.order_status) {
        case 'PAID':
        case 'SHIPPED':
          stats.pendingOrders++
          break
        case 'DELIVERED':
          stats.deliveredOrders++
          if (order.cashback_given) {
            stats.cashbackPaid += order.total_amount * 0.05 // 5% cashback
          }
          break
        case 'CANCELLED':
          stats.cancelledOrders++
          break
      }
    })

    return stats
  },

  // Cancel order and restore stock
  async cancelOrder(orderId: string, reason: string): Promise<boolean> {
    // Get order details to restore stock
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('items, order_status')
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) throw new Error('Order not found')
    
    if (order.order_status === 'SHIPPED' || order.order_status === 'DELIVERED') {
      throw new Error('Cannot cancel shipped or delivered orders')
    }

    // Restore stock for each item
    for (const item of order.items as Array<{product_id: string; quantity: number}>) {
      await supabase
        .from('products')
        .update({ 
          stock: supabase.raw('stock + ' + item.quantity)
        })
        .eq('id', item.product_id)
    }

    // Update order status
    return await this.updateOrderStatus(orderId, 'CANCELLED', `Cancelled: ${reason}`)
  }
}