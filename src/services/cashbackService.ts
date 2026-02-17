import { supabase } from '../integrations/supabase/client'
import type { Database } from '../integrations/supabase/types'
import type { Json } from "../integrations/supabase/database.types";

// Type definitions for cashback operations
type Cashback = Database['public']['Tables']['cashback']['Row']

// Glonni Cashback Service - USP: Instant cashback after delivery confirmation
export const cashbackService = {
  // Calculate cashback amount (5% of order total)
  calculateCashback(orderAmount: number): number {
    return orderAmount * 0.05 // 5% cashback
  },

  // Get pending cashback for user
  async getPendingCashback(userId: string): Promise<Cashback[]> {
    const { data, error } = await supabase
      .from('cashback')
      .select(`
        *,
        orders(order_number, total_amount, created_at, order_status)
      `)
      .eq('user_id', userId)
      .eq('status', 'ELIGIBLE')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get processed cashback for user
  async getProcessedCashback(userId: string): Promise<Cashback[]> {
    const { data, error } = await supabase
      .from('cashback')
      .select(`
        *,
        orders(order_number, total_amount, created_at, order_status),
        wallet_transactions(transaction_type, amount, created_at)
      `)
      .eq('user_id', userId)
      .eq('status', 'PROCESSED')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Process cashback for delivered orders
  async processCashbackForOrder(orderId: string): Promise<Cashback | null> {
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) throw new Error('Order not found')
    
    // Check if order is delivered and cashback not given
    if (order.order_status !== 'DELIVERED' || order.cashback_given) {
      return null
    }

    // Get existing cashback record
    const { data: existingCashback, error: cashbackError } = await supabase
      .from('cashback')
      .select('*')
      .eq('order_id', orderId)
      .single()
    
    if (!cashbackError && existingCashback) {
      // Process existing cashback
      await supabase.rpc('process_cashback_to_wallet', { 
        p_cashback_id: existingCashback.id 
      })
      return existingCashback
    }

    // Create new cashback record
    const cashbackAmount = this.calculateCashback(order.total_amount)
    
    const { data, error } = await supabase
      .from('cashback')
      .insert([{
        order_id: orderId,
        user_id: order.user_id,
        amount: cashbackAmount,
        percentage: 5.00,
        status: 'ELIGIBLE',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }])
      .select()
      .single()
    
    if (error) throw error

    // Process cashback immediately
    await supabase.rpc('process_cashback_to_wallet', { 
      p_cashback_id: data.id 
    })

    return data
  },

  // Get all cashback for admin dashboard
  async getAllCashback(): Promise<Cashback[]> {
    const { data, error } = await supabase
      .from('cashback')
      .select(`
        *,
        orders(order_number, total_amount, created_at, order_status),
        profiles(full_name, email)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get expired cashback (cleanup job)
  async getExpiredCashback(): Promise<Cashback[]> {
    const { data, error } = await supabase
      .from('cashback')
      .select('*')
      .eq('status', 'ELIGIBLE')
      .lt('expires_at', new Date().toISOString())
    
    if (error) throw error
    return data || []
  },

  // Mark expired cashback as expired
  async markCashbackAsExpired(cashbackId: string): Promise<void> {
    const { error } = await supabase
      .from('cashback')
      .update({ status: 'EXPIRED' })
      .eq('id', cashbackId)
      .eq('status', 'ELIGIBLE')
    
    if (error) throw error
  },

  // Get cashback statistics for user
  async getCashbackStats(userId: string): Promise<{
    totalEarned: number
    pendingAmount: number
    processedAmount: number
    expiredAmount: number
  }> {
    const { data, error } = await supabase
      .from('cashback')
      .select('status, amount')
      .eq('user_id', userId)
    
    if (error) throw error

    const stats = {
      totalEarned: 0,
      pendingAmount: 0,
      processedAmount: 0,
      expiredAmount: 0
    }

    data?.forEach(cashback => {
      stats.totalEarned += cashback.amount
      
      switch (cashback.status) {
        case 'ELIGIBLE':
          stats.pendingAmount += cashback.amount
          break
        case 'PROCESSED':
          stats.processedAmount += cashback.amount
          break
        case 'EXPIRED':
          stats.expiredAmount += cashback.amount
          break
      }
    })

    return stats
  }
}