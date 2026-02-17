# Backend Integration Plan - Glonni E-Commerce Platform

## Overview

This document outlines the complete backend integration strategy for transitioning from the current dummy-data frontend to a production-ready Supabase backend.

**Current State:**
- Frontend complete with Redux state management
- All data fetching functions are placeholders
- Database schema defined with Prisma
- Authentication not implemented
- Payment processing not implemented

**Target State:**
- Supabase PostgreSQL database
- Real-time data synchronization
- Row-level security policies
- Authentication via Supabase Auth
- File storage via Supabase Storage

---

## Integration Boundaries

### 1. Frontend Components → Backend Services

#### Public Components (Customer-facing)
```
components/Navbar.jsx
├─ Cart count → supabase.rpc('get_cart_count')
├─ User session → supabase.auth.getUser()
└─ Search → supabase.from('products').select()

components/Hero.jsx
└─ Latest products → supabase.from('products').select()

components/LatestProducts.jsx
└─ Product list → supabase.from('products').select()

components/BestSelling.jsx
└─ Top selling → supabase.from('products').select().order('sales_count')

components/ProductCard.jsx
└─ Product data → supabase.from('products').select()

components/ProductDetails.jsx
├─ Product info → supabase.from('products').select()
└─ Add to cart → supabase.rpc('add_to_cart')

components/OrderSummary.jsx
├─ Order calculation → supabase.rpc('calculate_order_total')
├─ Coupon validation → supabase.rpc('validate_coupon')
└─ Create order → supabase.from('orders').insert()

components/OrderItem.jsx
├─ Order details → supabase.from('orders').select()
└─ Rate product → supabase.from('ratings').insert()
```

#### Cart Components
```
app/(public)/cart/page.jsx
├─ Cart items → supabase.from('cart_items').select()
├─ Remove item → supabase.from('cart_items').delete()
└─ Update quantity → supabase.from('cart_items').update()

lib/features/cart/cartSlice.js
├─ addToCart → supabase.rpc('add_to_cart')
├─ removeFromCart → supabase.rpc('remove_from_cart')
└─ clearCart → supabase.from('cart_items').delete().eq('user_id')
```

#### Admin Components
```
components/admin/AdminLayout.jsx
└─ Admin verification → supabase.from('users').select('role')

app/admin/page.jsx
├─ Dashboard stats → supabase.rpc('get_admin_dashboard')
├─ Total products → supabase.from('products').count()
└─ All orders → supabase.from('orders').select()

app/admin/stores/page.jsx
└─ Store management → supabase.from('stores').select()

app/admin/approve/page.jsx
├─ Pending stores → supabase.from('stores').select().eq('status', 'pending')
└─ Approve store → supabase.from('stores').update().eq('id')

app/admin/coupons/page.jsx
├─ Coupon list → supabase.from('coupons').select()
├─ Create coupon → supabase.from('coupons').insert()
└─ Delete coupon → supabase.from('coupons').delete()
```

#### Store (Vendor) Components
```
components/store/StoreLayout.jsx
├─ Store verification → supabase.from('stores').select().eq('user_id')
└─ Store info → supabase.from('stores').select()

app/store/page.jsx
├─ Dashboard stats → supabase.rpc('get_store_dashboard')
├─ Store orders → supabase.from('orders').select().eq('store_id')
└─ Product ratings → supabase.from('ratings').select()

app/store/add-product/page.jsx
├─ Create product → supabase.from('products').insert()
└─ Upload images → supabase.storage.from('products').upload()

app/store/manage-product/page.jsx
├─ Product list → supabase.from('products').select().eq('store_id')
└─ Update stock → supabase.from('products').update()

app/store/orders/page.jsx
├─ Store orders → supabase.from('orders').select().eq('store_id')
├─ Order details → supabase.rpc('get_order_details')
└─ Update status → supabase.from('orders').update()
```

---

## Supabase Integration Points

### 1. Database Schema Migration

#### Current Prisma Schema → Supabase SQL
```sql
-- Users Table (Maps to auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    image_url TEXT,
    role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'VENDOR', 'ADMIN')),
    cart JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores Table
CREATE TABLE public.stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    description TEXT,
    address TEXT,
    logo_url TEXT,
    email TEXT,
    contact TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    mrp DECIMAL(10,2) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    images TEXT[] DEFAULT '{}',
    category TEXT NOT NULL,
    in_stock BOOLEAN DEFAULT true,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    total DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'ORDER_PLACED' CHECK (status IN ('ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED')),
    user_id UUID REFERENCES public.profiles(id),
    store_id UUID REFERENCES public.stores(id),
    address_id UUID REFERENCES public.addresses(id),
    is_paid BOOLEAN DEFAULT false,
    payment_method TEXT CHECK (payment_method IN ('COD', 'STRIPE')),
    is_coupon_used BOOLEAN DEFAULT false,
    coupon JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table (Join Table)
CREATE TABLE public.order_items (
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (order_id, product_id)
);

-- Addresses Table
CREATE TABLE public.addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    country TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings Table
CREATE TABLE public.ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    user_id UUID REFERENCES public.profiles(id),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupons Table
CREATE TABLE public.coupons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    discount INTEGER NOT NULL CHECK (discount > 0 AND discount <= 100),
    description TEXT,
    for_new_user BOOLEAN DEFAULT false,
    for_member BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart Items Table (Persistent Shopping Cart)
CREATE TABLE public.cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);
```

### 2. Row Level Security (RLS) Policies

#### User Profile Access
```sql
-- Users can only access their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
```

#### Store Access Control
```sql
-- Store owners can access their store
CREATE POLICY "Store owners can manage store" ON public.stores
    FOR ALL USING (user_id = auth.uid());

-- Everyone can view approved stores
CREATE POLICY "Approved stores are public" ON public.stores
    FOR SELECT USING (status = 'approved' AND is_active = true);
```

#### Product Access Control
```sql
-- Store owners can manage their products
CREATE POLICY "Store owners can manage products" ON public.products
    FOR ALL USING (
        store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
        )
    );

-- Everyone can view in-stock products from approved stores
CREATE POLICY "Public products are viewable" ON public.products
    FOR SELECT USING (
        in_stock = true AND
        store_id IN (
            SELECT id FROM stores WHERE status = 'approved' AND is_active = true
        )
    );
```

#### Order Access Control
```sql
-- Users can view their own orders
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (user_id = auth.uid());

-- Store owners can view orders for their store
CREATE POLICY "Store owners can view store orders" ON public.orders
    FOR SELECT USING (
        store_id IN (
            SELECT id FROM stores WHERE user_id = auth.uid()
        )
    );
```

#### Cart Access Control
```sql
-- Users can only access their own cart
CREATE POLICY "Users can manage own cart" ON public.cart_items
    FOR ALL USING (user_id = auth.uid());
```

### 3. Authentication Integration

#### Current: No Authentication
```javascript
// components/admin/AdminLayout.jsx:14-17
const fetchIsAdmin = async () => {
    setIsAdmin(true)  // ❌ Hardcoded
    setLoading(false)
}
```

#### Future: Supabase Auth Integration
```javascript
// lib/supabaseClient.js (New File)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

```javascript
// components/admin/AdminLayout.jsx (Updated)
import { supabase } from '@/lib/supabaseClient'

const fetchIsAdmin = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setIsAdmin(false)
            setLoading(false)
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        setIsAdmin(profile?.role === 'ADMIN')
    } catch (error) {
        setIsAdmin(false)
    } finally {
        setLoading(false)
    }
}
```

---

## Required Environment Variables

### Supabase Configuration
```env
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase Anonymous Key (Public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (Server-side only - keep secret)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Database URL (for migrations if needed)
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

### Authentication Configuration
```env
# Auth Settings (Optional - override Supabase defaults)
NEXT_PUBLIC_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_AUTH_REDIRECT_TO=http://localhost:3000/auth/callback
```

### Email Configuration
```env
# Email Service (if using Supabase email)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_smtp_password
```

### Storage Configuration
```env
# File Upload Settings
MAX_FILE_SIZE=5242880  # 5MB in bytes
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp
```

### Payment Configuration (Future)
```env
# Stripe Configuration (when implemented)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## API Boundary Mapping

### 1. Redux State → Supabase Functions

#### Cart Slice Migration
```javascript
// Current (lib/features/cart/cartSlice.js)
addToCart: (state, action) => {
    state.cartItems[action.payload.productId] = 
        (state.cartItems[action.payload.productId] || 0) + 1
}

// Future Supabase Integration
export const addToCart = createAsyncThunk(
    'cart/addToCart',
    async ({ productId, quantity = 1 }, { rejectWithValue }) => {
        try {
            const { data, error } = await supabase.rpc('add_to_cart', {
                product_id: productId,
                quantity: quantity
            })
            
            if (error) throw error
            return data
        } catch (error) {
            return rejectWithValue(error.message)
        }
    }
)
```

#### Product Slice Migration
```javascript
// Current (lib/features/product/productSlice.js)
setProduct: (state, action) => {
    state.list = action.payload
}

// Future Supabase Integration
export const fetchProducts = createAsyncThunk(
    'product/fetchProducts',
    async (filters = {}, { rejectWithValue }) => {
        try {
            let query = supabase
                .from('products')
                .select(`
                    *,
                    stores (
                        name,
                        username
                    )
                `)
                .eq('in_stock', true)
            
            if (filters.category) {
                query = query.eq('category', filters.category)
            }
            
            if (filters.search) {
                query = query.ilike('name', `%${filters.search}%`)
            }
            
            const { data, error } = await query
            
            if (error) throw error
            return data
        } catch (error) {
            return rejectWithValue(error.message)
        }
    }
)
```

### 2. Database Functions (Supabase RPC)

#### Shopping Cart Functions
```sql
-- Add item to cart
CREATE OR REPLACE FUNCTION add_to_cart(product_id UUID, quantity INTEGER DEFAULT 1)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO public.cart_items (user_id, product_id, quantity)
    VALUES (auth.uid(), product_id, quantity)
    ON CONFLICT (user_id, product_id)
    DO UPDATE SET quantity = cart_items.quantity + quantity;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove item from cart
CREATE OR REPLACE FUNCTION remove_from_cart(product_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM public.cart_items
    WHERE user_id = auth.uid() AND product_id = product_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get cart total
CREATE OR REPLACE FUNCTION get_cart_total()
RETURNS DECIMAL AS $$
DECLARE
    cart_total DECIMAL;
BEGIN
    SELECT COALESCE(SUM(p.price * ci.quantity), 0)
    INTO cart_total
    FROM public.cart_items ci
    JOIN public.products p ON ci.product_id = p.id
    WHERE ci.user_id = auth.uid();
    
    RETURN cart_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Order Functions
```sql
-- Create order from cart
CREATE OR REPLACE FUNCTION create_order(
    address_id UUID,
    payment_method TEXT DEFAULT 'COD',
    coupon_code TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    order_id UUID;
    cart_total DECIMAL;
    discount_amount DECIMAL := 0;
    final_total DECIMAL;
BEGIN
    -- Validate user owns address
    IF NOT EXISTS (
        SELECT 1 FROM public.addresses 
        WHERE id = address_id AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Invalid address';
    END IF;
    
    -- Get cart total
    cart_total := get_cart_total();
    
    -- Apply coupon if provided
    IF coupon_code IS NOT NULL THEN
        SELECT (discount / 100) * cart_total
        INTO discount_amount
        FROM public.coupons
        WHERE UPPER(code) = UPPER(coupon_code)
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (for_new_user IS FALSE OR order_count_for_user(auth.uid()) = 0);
    END IF;
    
    final_total := cart_total - discount_amount;
    
    -- Create order
    INSERT INTO public.orders (
        total, user_id, store_id, address_id, payment_method, is_coupon_used, coupon
    )
    SELECT 
        final_total,
        auth.uid(),
        p.store_id,
        address_id,
        payment_method,
        CASE WHEN coupon_code IS NOT NULL THEN true ELSE false END,
        COALESCE(JSON_BUILD_OBJECT('code', coupon_code, 'discount', discount_amount), '{}')
    FROM public.cart_items ci
    JOIN public.products p ON ci.product_id = p.id
    WHERE ci.user_id = auth.uid()
    LIMIT 1;
    
    -- Get the order ID
    GET DIAGNOSTICS order_id = ROW_COUNT;
    
    -- Move cart items to order items
    INSERT INTO public.order_items (order_id, product_id, quantity, price)
    SELECT 
        currval('orders_id_seq'),
        ci.product_id,
        ci.quantity,
        p.price
    FROM public.cart_items ci
    JOIN public.products p ON ci.product_id = p.id
    WHERE ci.user_id = auth.uid();
    
    -- Clear cart
    DELETE FROM public.cart_items WHERE user_id = auth.uid();
    
    RETURN order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Dashboard Functions
```sql
-- Admin dashboard stats
CREATE OR REPLACE FUNCTION get_admin_dashboard()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT JSON_BUILD_OBJECT(
        'products', (SELECT COUNT(*) FROM public.products),
        'revenue', (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE status = 'DELIVERED'),
        'orders', (SELECT COUNT(*) FROM public.orders),
        'stores', (SELECT COUNT(*) FROM public.stores WHERE status = 'approved'),
        'pending_stores', (SELECT COUNT(*) FROM public.stores WHERE status = 'pending')
    )
    INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Store dashboard stats
CREATE OR REPLACE FUNCTION get_store_dashboard()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT JSON_BUILD_OBJECT(
        'total_products', (SELECT COUNT(*) FROM public.products WHERE store_id = store_id_for_user(auth.uid())),
        'total_earnings', (SELECT COALESCE(SUM(total), 0) FROM public.orders 
                          WHERE store_id = store_id_for_user(auth.uid()) AND status = 'DELIVERED'),
        'total_orders', (SELECT COUNT(*) FROM public.orders WHERE store_id = store_id_for_user(auth.uid())),
        'ratings', (SELECT JSON_AGG(JSON_BUILD_OBJECT(
                        'user', JSON_BUILD_OBJECT('name', p.name, 'image', p.image_url),
                        'product', JSON_BUILD_OBJECT('name', pr.name, 'category', pr.category),
                        'rating', r.rating,
                        'review', r.review,
                        'created_at', r.created_at
                    ))
                    FROM public.ratings r
                    JOIN public.products pr ON r.product_id = pr.id
                    JOIN public.profiles p ON r.user_id = p.id
                    WHERE pr.store_id = store_id_for_user(auth.uid())
                    ORDER BY r.created_at DESC LIMIT 10)
    )
    INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## File Storage Integration

### Current: Local File Handling
```javascript
// Current approach in app/store/add-product/page.jsx
const [images, setImages] = useState({})
const onChange = e => setImages({ ...images, [key]: e.target.files[0] })
// Files stored in state, never uploaded
```

### Future: Supabase Storage Integration
```javascript
// lib/storage.js (New File)
import { supabase } from '@/lib/supabaseClient'

export const uploadProductImages = async (files, productId) => {
    const uploadPromises = Object.entries(files).map(async ([key, file]) => {
        const fileExt = file.name.split('.').pop()
        const fileName = `${productId}/${key}.${fileExt}`
        
        const { data, error } = await supabase.storage
            .from('products')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true
            })
        
        if (error) throw error
        
        const { data: { publicUrl } } = supabase.storage
            .from('products')
            .getPublicUrl(fileName)
            
        return publicUrl
    })
    
    return Promise.all(uploadPromises)
}
```

```javascript
// Updated app/store/add-product/page.jsx (Integration)
const onSubmitHandler = async (e) => {
    e.preventDefault()
    
    try {
        // Validate with Zod (already implemented)
        const validated = productSchema.parse(productInfo)
        
        // Create product first
        const { data: product, error: productError } = await supabase
            .from('products')
            .insert([{
                name: validated.name,
                description: validated.description,
                mrp: validated.mrp,
                price: validated.price,
                category: validated.category,
                store_id: storeId
            }])
            .select()
            .single()
            
        if (productError) throw productError
        
        // Upload images
        const imageUrls = await uploadProductImages(images, product.id)
        
        // Update product with image URLs
        const { error: updateError } = await supabase
            .from('products')
            .update({ images: imageUrls })
            .eq('id', product.id)
            
        if (updateError) throw updateError
        
        toast.success("Product added successfully!")
        router.push('/store')
        
    } catch (error) {
        toast.error(error.message)
    }
}
```

---

## Migration Strategy

### Phase 1: Supabase Setup (Week 1)
1. **Create Supabase Project**
   - Set up PostgreSQL database
   - Enable Auth and Storage
   - Configure environment variables

2. **Database Migration**
   - Convert Prisma schema to SQL
   - Create tables in Supabase
   - Implement RLS policies
   - Create RPC functions

3. **Authentication Integration**
   - Replace hardcoded auth checks
   - Implement Supabase Auth
   - Update role-based layouts
   - Add login/signup flows

### Phase 2: Data Layer Migration (Week 2)
1. **Redux State Integration**
   - Convert Redux slices to use Supabase
   - Implement async thunks
   - Replace dummy data with real data
   - Add error handling

2. **Component Updates**
   - Update all data fetching functions
   - Replace static state with API calls
   - Implement loading states
   - Add error states

### Phase 3: File Storage & Optimization (Week 3)
1. **File Upload Migration**
   - Implement Supabase Storage
   - Update product/store creation
   - Add image optimization
   - Set up CDN

2. **Real-time Features**
   - Implement real-time updates
   - Order status notifications
   - Live cart synchronization
   - Admin dashboard real-time data

### Phase 4: Testing & Optimization (Week 4)
1. **Integration Testing**
   - End-to-end flow testing
   - Performance optimization
   - Error handling validation
   - Security audit verification

---

## Benefits of Supabase Integration

### 1. **Real-time Capabilities**
```javascript
// Real-time order updates for vendors
supabase
  .channel('store-orders')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'orders', filter: `store_id=eq.${storeId}` },
    (payload) => {
      // Update order in real-time
      dispatch(updateOrderStatus(payload.new))
    }
  )
  .subscribe()
```

### 2. **Row Level Security**
- Automatic data isolation by user/store
- No need for complex authorization logic in components
- Database-enforced security policies

### 3. **File Storage**
- Automatic image optimization
- CDN delivery
- Secure file access with RLS
- No need for external file services

### 4. **Authentication**
- Built-in OAuth providers
- Email verification
- Password reset
- Session management

### 5. **Edge Functions**
- Serverless functions for complex logic
- Payment webhook handling
- Email sending capabilities
- Third-party API integration

---

## Risk Assessment

### Technical Risks
1. **Data Migration Complexity**
   - Risk: Data loss during migration
   - Mitigation: Comprehensive backups, staged migration

2. **RLS Policy Complexity**
   - Risk: Overly restrictive policies breaking functionality
   - Mitigation: Thorough testing, gradual rollout

3. **Performance Impact**
   - Risk: Database queries slower than client-side state
   - Mitigation: Query optimization, caching strategies

### Business Risks
1. **Downtime During Migration**
   - Risk: Service unavailable during transition
   - Mitigation: Blue-green deployment, rollback plan

2. **User Experience Impact**
   - Risk: Slower page loads with real API calls
   - Mitigation: Optimistic updates, loading states

---

## Success Metrics

### Technical Metrics
- 100% of API calls replaced with Supabase integration
- All RLS policies tested and working
- Real-time features functional
- Zero data loss during migration

### Performance Metrics
- Page load times < 2 seconds
- API response times < 500ms
- 99.9% uptime
- Zero security vulnerabilities

### User Experience Metrics
- Seamless transition from current UX
- Real-time updates working
- No data inconsistencies
- All authentication flows functional

---

## Conclusion

This backend integration plan provides a comprehensive roadmap for transitioning from the current dummy-data frontend to a production-ready Supabase backend. The integration maintains all existing functionality while adding:

1. **Secure authentication and authorization**
2. **Real-time data synchronization**
3. **Row-level security**
4. **Scalable file storage**
5. **Production-ready database with proper constraints**

The phased approach minimizes risk while ensuring a smooth transition. All current UI flows remain unchanged, focusing only on replacing the underlying data layer with robust Supabase services.

**Next Steps:**
1. Set up Supabase project
2. Configure environment variables
3. Begin Phase 1 implementation
4. Follow migration timeline

This integration will transform the application from a prototype into a production-ready e-commerce platform with enterprise-grade security and scalability.