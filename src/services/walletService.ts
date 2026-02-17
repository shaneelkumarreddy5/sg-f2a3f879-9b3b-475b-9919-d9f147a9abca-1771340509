import { supabase } from '../integrations/supabase/client'
import type { Database } from '../integrations/supabase/types'
import type { Json } from "database.types";

// Type definitions for wallet operations
type Wallet = Database['public']['Tables']['wallets']['Row']
type WalletTransaction = Database['public']['Tables']['wallet_transactions']['Row']
type Cashback = Database['public']['Tables']['cashback']['Row']

// Glonni Wallet Service - Manages user wallets and cashback
export const walletService = {
  // Get user wallet (creates if not exists)
  async getUserWallet(userId: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    
    // Create wallet if not exists
    if (!data) {
      await supabase
        .rpc('create_user_wallet', { p_user_id: userId })
      
      // Fetch the newly created wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      return wallet
    }
    
    return data
  },

  // Get wallet transaction history
  async getWalletTransactions(userId: string, limit = 50): Promise<WalletTransaction[]> {
    const { data, error } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        wallet_id!inner(
          user_id
        )
      `)
      .eq('wallet_id.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  },

  // Get user's cashback history
  async getUserCashback(userId: string): Promise<Cashback[]> {
    const { data, error } = await supabase
      .from('cashback')
      .select(`
        *,
        orders(order_number, total_amount, created_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Use wallet balance for payment
  async useWalletBalance(userId: string, orderId: string, amount: number): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('use_wallet_balance', {
        p_user_id: userId,
        p_order_id: orderId,
        p_amount: amount
      })
    
    if (error) throw error
    return data || false
  },

  // Check if user has sufficient balance
  async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const wallet = await this.getUserWallet(userId)
    return wallet ? (wallet.balance || 0) >= amount : false
  },

  // Get wallet balance
  async getBalance(userId: string): Promise<number> {
    const wallet = await this.getUserWallet(userId)
    return wallet ? (wallet.balance || 0) : 0
  },

  // Process cashback to wallet (after delivery confirmation)
  async processCashbackToWallet(cashbackId: string): Promise<boolean> {
    const { data, error } = await supabase
      .rpc('process_cashback_to_wallet', { p_cashback_id: cashbackId })
    
    if (error) throw error
    return data || false
  },

  // Add balance to wallet (admin function for refunds/bonuses)
  async addBalance(userId: string, amount: number, description: string): Promise<WalletTransaction> {
    // Get or create wallet
    const wallet = await this.getUserWallet(userId)
    if (!wallet) throw new Error('Wallet not found')

    // Create credit transaction
    const { data, error } = await supabase
      .from('wallet_transactions')
      .insert([{
        wallet_id: wallet.id,
        transaction_type: 'CREDIT',
        amount,
        description
      }])
      .select()
      .single()
    
    if (error) throw error

    // Update wallet balance
    await supabase
      .from('wallets')
      .update({
        balance: (wallet.balance || 0) + amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id)

    return data
  }
}