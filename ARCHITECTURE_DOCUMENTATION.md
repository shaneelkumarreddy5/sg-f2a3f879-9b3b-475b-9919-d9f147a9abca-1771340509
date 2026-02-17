# Glonni E-Commerce Platform - Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend/API Architecture](#backend-api-architecture)
5. [Authentication Model](#authentication-model)
6. [Role Separation & Access Control](#role-separation--access-control)
7. [Order Lifecycle](#order-lifecycle)
8. [Payment Lifecycle](#payment-lifecycle)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [Current State & Limitations](#current-state--limitations)

---

## Overview

Glonni is a multi-vendor e-commerce platform built with Next.js 15 (App Router), featuring:
- **Multi-vendor marketplace** where stores can sell products
- **Admin panel** for platform management
- **Vendor dashboard** for store management
- **Customer interface** for shopping and order tracking
- **Real-time cart management** using Redux
- **Order processing** with status tracking
- **Coupon system** for discounts

**Current Development Stage:** 🚧 **Pre-Production/Development**
- UI and component structure: ✅ Complete
- Security hardening: ✅ Applied (validation, headers, CSRF)
- Authentication: ❌ Not implemented (uses dummy data)
- Backend API: ❌ Not implemented (placeholder functions)
- Payment integration: ❌ Not implemented

---

## Technology Stack

### Frontend
```javascript
{
  "framework": "Next.js 15.3.5 (App Router)",
  "ui": "React 19.2.1",
  "styling": "Tailwind CSS 4",
  "state": "Redux Toolkit (@reduxjs/toolkit)",
  "forms": "React Hook Form",
  "validation": "Zod",
  "icons": "Lucide React",
  "notifications": "React Hot Toast",
  "charts": "Recharts",
  "dates": "date-fns"
}
```

### Backend (Planned)
```javascript
{
  "database": "PostgreSQL (via Prisma ORM)",
  "orm": "Prisma",
  "api": "Next.js API Routes",
  "auth": "Not implemented (NextAuth.js recommended)",
  "fileStorage": "Not implemented (Uploadthing/S3 recommended)",
  "payments": "Not implemented (Stripe recommended)"
}
```

### Security
```javascript
{
  "validation": "Zod schemas",
  "headers": "CSP, X-Frame-Options, X-Content-Type-Options",
  "middleware": "Route protection structure in place",
  "csrf": "Next.js built-in (SameSite cookies)",
  "rateLimit": "Not implemented (Upstash recommended)"
}
```

---

## Frontend Architecture

### 1. Application Structure

```
app/
├── (public)/              # Public-facing customer pages
│   ├── layout.jsx         # Public layout with Navbar + Footer
│   ├── page.jsx           # Homepage (Hero, Products, Newsletter)
│   ├── cart/              # Shopping cart
│   ├── orders/            # Customer order history
│   ├── product/[id]/      # Product detail page
│   ├── shop/              # Product listings & store pages
│   └── create-store/      # Vendor registration
│
├── admin/                 # Platform admin dashboard
│   ├── layout.jsx         # Admin layout (sidebar + navbar)
│   ├── page.jsx           # Admin analytics dashboard
│   ├── stores/            # Manage all stores
│   ├── approve/           # Approve pending stores
│   └── coupons/           # Manage discount coupons
│
├── store/                 # Vendor dashboard
│   ├── layout.jsx         # Store layout (sidebar + navbar)
│   ├── page.jsx           # Store analytics dashboard
│   ├── add-product/       # Create new products
│   ├── manage-product/    # Edit product inventory
│   └── orders/            # Vendor order management
│
└── api/                   # API routes (currently minimal)
    └── orders/
        └── create/        # Order creation endpoint (validation only)
```

### 2. Component Architecture

```
components/
├── Public Components
│   ├── Navbar.jsx             # Main navigation + cart + search
│   ├── Footer.jsx             # Site footer
│   ├── Hero.jsx               # Homepage hero section
│   ├── LatestProducts.jsx     # Product grid (latest)
│   ├── BestSelling.jsx        # Product grid (best sellers)
│   ├── ProductCard.jsx        # Reusable product card
│   ├── ProductDetails.jsx     # Product info + add to cart
│   ├── ProductDescription.jsx # Tabs: Description + Reviews
│   ├── Counter.jsx            # Quantity selector (cart)
│   ├── OrderSummary.jsx       # Checkout summary + address
│   ├── OrderItem.jsx          # Single order display
│   ├── AddressModal.jsx       # Address form modal
│   ├── RatingModal.jsx        # Product review modal
│   └── Rating.jsx             # Star rating display
│
├── Admin Components
│   ├── AdminLayout.jsx        # Admin page wrapper
│   ├── AdminNavbar.jsx        # Admin top bar
│   ├── AdminSidebar.jsx       # Admin navigation
│   ├── StoreInfo.jsx          # Store details card
│   └── OrdersAreaChart.jsx    # Revenue chart
│
└── Store (Vendor) Components
    ├── StoreLayout.jsx        # Vendor page wrapper
    ├── StoreNavbar.jsx        # Vendor top bar
    └── StoreSidebar.jsx       # Vendor navigation
```

### 3. State Management (Redux Toolkit)

#### Global State Structure

```javascript
// lib/store.js
{
  cart: {
    total: Number,              // Total items in cart
    cartItems: {                // Product ID -> Quantity map
      [productId]: quantity
    }
  },
  
  product: {
    list: Product[]             // All products (loaded from dummy data)
  },
  
  address: {
    list: Address[]             // User's saved addresses
  },
  
  rating: {
    ratings: Rating[]           // User's product ratings
  }
}
```

#### Redux Slices

**Cart Slice** (`lib/features/cart/cartSlice.js`)
```javascript
// Actions:
- addToCart(productId)         // Increment quantity
- removeFromCart(productId)    // Decrement quantity
- deleteItemFromCart(productId) // Remove completely
- clearCart()                  // Empty cart

// Usage Example:
const dispatch = useDispatch();
dispatch(addToCart({ productId: "prod_123" }));

const { cartItems, total } = useSelector(state => state.cart);
```

**Product Slice** (`lib/features/product/productSlice.js`)
```javascript
// Actions:
- setProduct(products)         // Replace product list
- clearProduct()               // Empty product list

// Current Implementation:
- Loads dummy data from assets/assets.js on mount
- No backend integration yet
```

**Address Slice** (`lib/features/address/addressSlice.js`)
```javascript
// Actions:
- addAddress(address)          // Add new address

// Current Implementation:
- Starts with one dummy address
- User can add more via AddressModal
- NOT persisted (lost on refresh)
```

**Rating Slice** (`lib/features/rating/ratingSlice.js`)
```javascript
// Actions:
- addRating({ orderId, productId, rating, review })

// Current Implementation:
- Stores ratings in memory
- NOT persisted to backend yet
```

### 4. Routing & Navigation Flow

#### Public Routes (Customer Journey)
```
1. Homepage (/)
   └─> Browse products
       ├─> Product Detail (/product/[id])
       │   └─> Add to Cart
       │       └─> Cart (/cart)
       │           └─> Checkout (select address + payment)
       │               └─> Place Order
       │                   └─> Orders (/orders)
       │                       └─> Rate Product (if delivered)
       │
       ├─> Shop (/shop)
       │   └─> Filter/Search products
       │       └─> Store Page (/shop/[username])
       │
       └─> Create Store (/create-store)
           └─> Vendor registration form
```

#### Admin Routes
```
/admin
├─> Dashboard (/)           # Analytics overview
├─> Stores (/stores)        # List all active stores
├─> Approve (/approve)      # Pending store applications
└─> Coupons (/coupons)      # Discount code management
```

#### Vendor Routes
```
/store
├─> Dashboard (/)              # Store analytics + reviews
├─> Add Product (/add-product) # Create new product
├─> Manage (/manage-product)   # Toggle stock status
└─> Orders (/orders)           # View & update order status
```

### 5. Data Flow Example: Add to Cart

```
1. User clicks "Add to Cart" on ProductDetails component
   ↓
2. Component dispatches Redux action:
   dispatch(addToCart({ productId }))
   ↓
3. Redux cartSlice reducer updates state:
   - Increments cartItems[productId] counter
   - Increments total count
   ↓
4. All components using useSelector(state => state.cart) re-render
   ↓
5. Navbar displays updated cart count badge
   Cart page shows updated items & total
```

### 6. Client-Side Validation

**Forms with Zod Validation:**
- Create Store (`app/(public)/create-store/page.jsx`)
- Add Product (`app/store/add-product/page.jsx`)
- File Uploads (both forms)

**Validation Flow:**
```javascript
1. User submits form
   ↓
2. onSubmit handler calls storeSchema.safeParse(formData)
   ↓
3. If validation fails:
   - Extract first error message
   - Display error toast
   - Prevent submission
   ↓
4. If validation passes:
   - Proceed to API call (currently commented out)
```

---

## Backend/API Architecture

### Current State: ⚠️ **NOT IMPLEMENTED**

The backend is currently in a **placeholder state**. All data fetching functions are empty with comments like:
```javascript
const fetchProducts = async () => {
    // Logic to fetch products
    setProducts(dummyData)  // Uses hardcoded data instead
}
```

### Planned API Structure

#### API Routes (to be implemented)
```
app/api/
├── auth/
│   ├── [...nextauth]/route.js    # NextAuth.js endpoints
│   └── register/route.js         # User registration
│
├── products/
│   ├── route.js                  # GET: List, POST: Create
│   └── [id]/route.js             # GET: Detail, PATCH: Update
│
├── orders/
│   ├── create/route.js           # ✅ Structure in place (validation only)
│   └── [id]/
│       └── status/route.js       # Update order status
│
├── stores/
│   ├── route.js                  # GET: List, POST: Create
│   ├── [id]/route.js             # GET: Detail, PATCH: Update
│   └── approve/route.js          # PATCH: Approve/reject store
│
├── coupons/
│   ├── route.js                  # GET: List, POST: Create
│   ├── validate/route.js         # POST: Check coupon validity
│   └── [code]/route.js           # DELETE: Remove coupon
│
└── uploads/
    └── route.js                  # POST: Handle file uploads
```

### Database Schema (Prisma)

**Location:** `prisma/schema.prisma`

#### Entity Relationship Diagram
```
User (Customer/Vendor/Admin)
 ├─ has one Store (if vendor)
 ├─ has many Orders (as buyer)
 ├─ has many Addresses
 └─ has many Ratings

Store (Vendor)
 ├─ belongs to one User
 ├─ has many Products
 └─ has many Orders (as seller)

Product
 ├─ belongs to one Store
 ├─ has many OrderItems
 └─ has many Ratings

Order
 ├─ belongs to one User (buyer)
 ├─ belongs to one Store (seller)
 ├─ belongs to one Address (delivery)
 ├─ has many OrderItems
 └─ has status: ORDER_PLACED → PROCESSING → SHIPPED → DELIVERED

OrderItem (join table)
 ├─ belongs to one Order
 └─ belongs to one Product

Rating (Review)
 ├─ belongs to one User
 └─ belongs to one Product

Address
 └─ belongs to one User

Coupon
 └─ standalone (can be applied to any order)
```

#### Key Models

**User Model**
```prisma
model User {
    id            String    @id @default(cuid())  // Secure ID generation
    name          String
    email         String    @unique              // Enforces uniqueness
    emailVerified DateTime?                      // Email verification status
    image         String
    cart          Json      @default("{}")       // Shopping cart JSON
    
    // Relations
    ratings     Rating[]
    Address     Address[]
    store       Store?                           // One-to-one (vendors only)
    buyerOrders Order[]   @relation("BuyerRelation")
}
```

**Store Model**
```prisma
model Store {
    id          String   @id @default(cuid())
    userId      String   @unique                // One user = one store
    name        String
    username    String   @unique              // Store URL slug
    description String
    address     String
    logo        String
    email       String
    contact     String
    status      String   @default("pending")  // pending/approved/rejected
    isActive    Boolean  @default(false)      // Admin can disable
    
    Product Product[]
    Order   Order[]
    user    User      @relation(fields: [userId], references: [id])
}
```

**Product Model**
```prisma
model Product {
    id          String   @id @default(cuid())
    name        String
    description String
    mrp         Float                          // Maximum Retail Price
    price       Float                          // Selling price
    images      String[]                       // Array of image URLs
    category    String
    inStock     Boolean  @default(true)        // Inventory status
    storeId     String                         // Belongs to store
    
    store      Store       @relation(fields: [storeId], references: [id], onDelete: Cascade)
    orderItems OrderItem[]
    rating     Rating[]
}
```

**Order Model**
```prisma
model Order {
    id            String        @id @default(cuid())
    total         Float                              // SECURITY: Must be calculated server-side
    status        OrderStatus   @default(ORDER_PLACED)
    userId        String
    storeId       String
    addressId     String
    isPaid        Boolean       @default(false)
    paymentMethod PaymentMethod                      // COD or STRIPE
    isCouponUsed  Boolean       @default(false)
    coupon        Json          @default("{}")       // Coupon details if used
    orderItems    OrderItem[]
    
    user    User    @relation("BuyerRelation", fields: [userId], references: [id])
    store   Store   @relation(fields: [storeId], references: [id])
    address Address @relation(fields: [addressId], references: [id])
}

enum OrderStatus {
    ORDER_PLACED
    PROCESSING
    SHIPPED
    DELIVERED
}

enum PaymentMethod {
    COD      // Cash on Delivery
    STRIPE   // Online payment
}
```

**OrderItem Model** (Join table for many-to-many)
```prisma
model OrderItem {
    orderId   String
    productId String
    quantity  Int
    price     Float    // SECURITY: Price snapshot at order time
    
    order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
    product Product @relation(fields: [productId], references: [id])
    
    @@id([orderId, productId])  // Composite primary key
}
```

### Planned Backend Flow Examples

#### Example 1: Product Purchase Flow (To Be Implemented)
```javascript
// Client: app/(public)/cart/page.jsx
const handleCheckout = async () => {
    const response = await fetch('/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({
            items: cartArray,
            addressId: selectedAddress.id,
            paymentMethod: paymentMethod,
            couponCode: coupon?.code
        })
    });
    
    const { orderId, paymentUrl } = await response.json();
    
    if (paymentMethod === 'STRIPE') {
        router.push(paymentUrl);  // Redirect to Stripe
    } else {
        router.push(`/orders/${orderId}`);  // COD confirmation
    }
}

// Server: app/api/orders/create/route.js (Currently only has validation)
export async function POST(request) {
    // 1. Authenticate user
    const session = await getServerSession();
    if (!session) return unauthorized();
    
    // 2. Validate input
    const validated = orderSchema.parse(await request.json());
    
    // 3. Calculate total server-side (prevent price manipulation)
    const products = await prisma.product.findMany({
        where: { id: { in: validated.items.map(i => i.id) } }
    });
    const serverTotal = products.reduce((sum, p) => 
        sum + (p.price * validated.items.find(i => i.id === p.id).quantity), 0
    );
    
    // 4. Apply coupon if valid
    let discount = 0;
    if (validated.couponCode) {
        const coupon = await validateCoupon(validated.couponCode, session.user.id);
        discount = (coupon.discount / 100) * serverTotal;
    }
    
    // 5. Create order in database
    const order = await prisma.order.create({
        data: {
            total: serverTotal - discount,
            userId: session.user.id,
            storeId: products[0].storeId,
            addressId: validated.addressId,
            paymentMethod: validated.paymentMethod,
            isCouponUsed: !!validated.couponCode,
            coupon: validated.couponCode ? { code: validated.couponCode, discount } : {},
            orderItems: {
                create: products.map(p => ({
                    productId: p.id,
                    quantity: validated.items.find(i => i.id === p.id).quantity,
                    price: p.price  // Snapshot current price
                }))
            }
        }
    });
    
    // 6. Handle payment
    if (validated.paymentMethod === 'STRIPE') {
        const paymentUrl = await createStripeCheckout(order);
        return json({ orderId: order.id, paymentUrl });
    }
    
    return json({ orderId: order.id });
}
```

---

## Authentication Model

### Current State: ⚠️ **NOT IMPLEMENTED**

**What exists:**
- Database schema has User model with required fields
- Middleware structure for route protection (`middleware.ts`)
- Layout components check for auth status (but always return true)

**What's missing:**
- No authentication provider (NextAuth.js/Clerk/Auth0)
- No session management
- No login/signup pages
- No password hashing
- No JWT token generation
- No OAuth integration

### Planned Authentication Flow (NextAuth.js Recommended)

#### Installation & Setup (To Be Done)
```bash
npm install next-auth @auth/prisma-adapter
```

#### Configuration Structure
```javascript
// app/api/auth/[...nextauth]/route.js (To Be Created)
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        // Email/Password login
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email },
                    include: { store: true }  // Include store info
                });
                
                if (!user) throw new Error("No user found");
                
                const isValid = await bcrypt.compare(
                    credentials.password, 
                    user.password
                );
                
                if (!isValid) throw new Error("Invalid password");
                
                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.store ? "VENDOR" : "USER",  // Determine role
                    storeId: user.store?.id
                };
            }
        }),
        
        // Google OAuth
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET
        })
    ],
    
    callbacks: {
        // Add custom fields to JWT
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.storeId = user.storeId;
            }
            return token;
        },
        
        // Add custom fields to session
        async session({ session, token }) {
            session.user.role = token.role;
            session.user.storeId = token.storeId;
            return session;
        }
    },
    
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60  // 30 days
    },
    
    pages: {
        signIn: "/auth/signin",     // Custom login page
        signUp: "/auth/signup",     // Custom signup page
        error: "/auth/error"        // Error page
    }
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### Protected Route Middleware (Partially Implemented)
```javascript
// middleware.ts (Currently has structure, needs session check)
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function middleware(request) {
    const session = await getServerSession(authOptions);
    
    // Admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!session || session.user.role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }
    
    // Vendor routes
    if (request.nextUrl.pathname.startsWith('/store')) {
        if (!session || session.user.role !== 'VENDOR') {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }
    
    // Customer routes (orders, cart checkout)
    if (request.nextUrl.pathname.startsWith('/orders')) {
        if (!session) {
            return NextResponse.redirect(new URL('/auth/signin', request.url));
        }
    }
    
    return NextResponse.next();
}
```

#### Login Flow (To Be Implemented)
```javascript
// app/auth/signin/page.jsx (To Be Created)
import { signIn } from "next-auth/react"

export default function SignIn() {
    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await signIn("credentials", {
            email: e.target.email.value,
            password: e.target.password.value,
            redirect: false
        });
        
        if (result.error) {
            toast.error(result.error);
        } else {
            router.push('/');  // Redirect to homepage
        }
    }
    
    return (
        <form onSubmit={handleSubmit}>
            {/* Login form fields */}
        </form>
    )
}
```

#### Using Session in Components (To Be Implemented)
```javascript
// Example: components/Navbar.jsx
import { useSession, signOut } from "next-auth/react"

export default function Navbar() {
    const { data: session, status } = useSession();
    
    return (
        <nav>
            {status === "loading" && <Spinner />}
            
            {status === "unauthenticated" && (
                <button onClick={() => router.push('/auth/signin')}>
                    Login
                </button>
            )}
            
            {status === "authenticated" && (
                <>
                    <span>Hi, {session.user.name}</span>
                    <button onClick={() => signOut()}>Logout</button>
                </>
            )}
        </nav>
    )
}
```

---

## Role Separation & Access Control

### User Roles

The platform supports **three distinct user roles**, each with different permissions and interfaces:

#### 1. **Customer (Default User)**

**Access:**
- ✅ Browse products and stores
- ✅ Add items to cart
- ✅ Place orders
- ✅ Track order status
- ✅ Rate/review delivered products
- ✅ Apply for vendor account

**Restricted from:**
- ❌ Admin dashboard (`/admin/*`)
- ❌ Vendor dashboard (`/store/*`)
- ❌ Creating/editing products
- ❌ Managing orders (except viewing own)

**Routes:**
```
/ (homepage)
/shop
/shop/[username] (store page)
/product/[id]
/cart
/orders (own orders only)
/create-store (vendor application)
```

**UI Components:**
- `components/Navbar.jsx` - Customer navigation
- `components/Footer.jsx` - Site footer
- `app/(public)/layout.jsx` - Public layout wrapper

**Data Access:**
- Can view: All products, all stores (public)
- Can modify: Own cart, own addresses, own orders (view only)

#### 2. **Vendor (Store Owner)**

**Becomes Vendor When:**
1. User submits store application via `/create-store`
2. Admin approves store in `/admin/approve`
3. `Store` record created with `userId` link
4. User gains access to `/store/*` routes

**Access:**
- ✅ All customer features
- ✅ Vendor dashboard analytics
- ✅ Add/edit own products
- ✅ Manage product inventory (stock status)
- ✅ View and update orders for own store
- ✅ View product ratings/reviews

**Restricted from:**
- ❌ Admin dashboard
- ❌ Managing other stores' products
- ❌ Viewing other stores' orders
- ❌ Approving stores or creating coupons

**Routes:**
```
/store                    # Vendor dashboard
/store/add-product        # Create product
/store/manage-product     # Edit inventory
/store/orders             # Store orders
```

**UI Components:**
- `components/store/StoreLayout.jsx` - Vendor page wrapper
- `components/store/StoreNavbar.jsx` - Vendor top bar
- `components/store/StoreSidebar.jsx` - Vendor navigation menu

**Data Access:**
- Can view: Own store info, own products, orders for own store
- Can modify: Own products, order status (for own store orders)
- Cannot access: Other stores' data, platform-wide analytics

**Store Dashboard Features:**
```javascript
// app/store/page.jsx - Vendor Dashboard
{
    totalProducts: 45,           // Count of products in store
    totalEarnings: 12543.50,     // Revenue from delivered orders
    totalOrders: 89,             // All orders for this store
    ratings: [                   // Reviews for store's products
        {
            user: { name, image },
            product: { name, category },
            rating: 5,
            review: "Great product!",
            createdAt: Date
        }
    ]
}
```

**Order Management:**
```javascript
// app/store/orders/page.jsx
// Vendor can update order status with validation:

ORDER_PLACED → PROCESSING → SHIPPED → DELIVERED
     ↓              ↓            ↓           ↓
  (Can move)   (Can move)   (Can move)  (Final)

// Invalid transitions are blocked:
// - Cannot skip steps (PLACED → SHIPPED directly)
// - Cannot go backwards (SHIPPED → PROCESSING)
// - Cannot modify DELIVERED orders
```

#### 3. **Admin (Platform Manager)**

**Access:**
- ✅ All customer features
- ✅ All vendor features
- ✅ Platform-wide analytics
- ✅ Manage all stores (view, activate/deactivate)
- ✅ Approve/reject store applications
- ✅ Create and manage discount coupons
- ✅ View all orders across all stores

**Routes:**
```
/admin                # Platform dashboard
/admin/stores         # Manage active stores
/admin/approve        # Pending store applications
/admin/coupons        # Discount management
```

**UI Components:**
- `components/admin/AdminLayout.jsx` - Admin page wrapper
- `components/admin/AdminNavbar.jsx` - Admin top bar
- `components/admin/AdminSidebar.jsx` - Admin navigation menu
- `components/admin/StoreInfo.jsx` - Store detail card

**Data Access:**
- Can view: All data across entire platform
- Can modify: Store approval status, store active/inactive, coupons
- Full audit capabilities (planned)

**Admin Dashboard Features:**
```javascript
// app/admin/page.jsx - Platform Dashboard
{
    products: 523,              // Total products across all stores
    revenue: 145230.50,         // Platform-wide revenue
    orders: 1205,               // Total orders
    stores: 45,                 // Active stores count
    allOrders: [...]            // Order data for charts
}

// Analytics Chart (OrdersAreaChart component):
// - Monthly revenue trends
// - Order volume over time
// - Growth metrics
```

**Store Management:**
```javascript
// app/admin/stores/page.jsx
// Admin can toggle store active status:

Active Store (isActive: true)
    ↓
    Admin toggles switch
    ↓
Inactive Store (isActive: false)
    ↓
    Products hidden from customers
    Orders still accessible
    Store can reactivate later
```

**Approval Workflow:**
```javascript
// app/admin/approve/page.jsx
Store Application (status: "pending")
    ↓
    Admin reviews: logo, description, contact info
    ↓
    Admin clicks "Approve" or "Reject"
    ↓
Approved (status: "approved", isActive: true)
    └─> Store appears in /shop
    └─> Vendor gains access to /store dashboard
    
OR

Rejected (status: "rejected")
    └─> User notified
    └─> Can reapply with changes
```

**Coupon Management:**
```javascript
// app/admin/coupons/page.jsx
Coupon Features:
- code: String (unique identifier, e.g., "WELCOME10")
- discount: Number (percentage off, e.g., 10 = 10% off)
- forNewUser: Boolean (first-time customers only)
- forMember: Boolean (premium members only)
- isPublic: Boolean (displayed on site or private code)
- expiresAt: Date (coupon expiration)

Admin can:
- Create new coupons
- Delete expired coupons
- View coupon usage (planned)
```

### Role Determination Logic (Current Placeholder)

```javascript
// components/admin/AdminLayout.jsx (Lines 14-17)
const fetchIsAdmin = async () => {
    // ⚠️ PLACEHOLDER: Always returns true
    setIsAdmin(true)
    setLoading(false)
}

// PLANNED IMPLEMENTATION:
const fetchIsAdmin = async () => {
    const session = await getServerSession();
    
    // Check if user has admin role in database
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }  // Requires adding 'role' field to User model
    });
    
    setIsAdmin(user?.role === 'ADMIN');
    setLoading(false);
}
```

```javascript
// components/store/StoreLayout.jsx (Lines 20-23)
const fetchIsSeller = async () => {
    // ⚠️ PLACEHOLDER: Always returns true + dummy data
    setIsSeller(true)
    setStoreInfo(dummyStoreData)
    setLoading(false)
}

// PLANNED IMPLEMENTATION:
const fetchIsSeller = async () => {
    const session = await getServerSession();
    
    // Check if user owns a store
    const store = await prisma.store.findUnique({
        where: { 
            userId: session.user.id,
            status: 'approved'  // Only approved stores
        }
    });
    
    if (store) {
        setIsSeller(true);
        setStoreInfo(store);
    } else {
        setIsSeller(false);
    }
    setLoading(false);
}
```

### Authorization Middleware (Currently Basic)

```javascript
// middleware.ts (Lines 1-68)
// Currently implements:
// ✅ Security headers (CSP, X-Frame-Options)
// ✅ Route matching for /admin and /store
// ❌ Session verification (always allows access)

// Planned enforcement:
export async function middleware(request) {
    const session = await getServerSession();
    
    // Admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        if (!session) {
            return NextResponse.redirect(new URL('/auth/signin', request.url));
        }
        
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true }
        });
        
        if (user?.role !== 'ADMIN') {
            return NextResponse.json(
                { error: 'Unauthorized' }, 
                { status: 403 }
            );
        }
    }
    
    // Vendor routes
    if (request.nextUrl.pathname.startsWith('/store')) {
        if (!session) {
            return NextResponse.redirect(new URL('/auth/signin', request.url));
        }
        
        const store = await prisma.store.findUnique({
            where: { userId: session.user.id, status: 'approved' }
        });
        
        if (!store) {
            return NextResponse.json(
                { error: 'No store found' }, 
                { status: 403 }
            );
        }
    }
    
    return NextResponse.next();
}
```

### Data Isolation (Planned Implementation)

#### Row-Level Security (RLS) Policies

```sql
-- Example RLS policy for Store orders
-- Ensures vendors only see their own store's orders

CREATE POLICY vendor_orders_policy ON "Order"
    FOR SELECT
    USING (
        "storeId" IN (
            SELECT id FROM "Store" 
            WHERE "userId" = current_user_id()
        )
    );

-- Admin bypass (if implementing role field)
CREATE POLICY admin_all_orders_policy ON "Order"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE id = current_user_id()
            AND role = 'ADMIN'
        )
    );
```

#### API-Level Authorization

```javascript
// Example: app/api/products/[id]/route.js
export async function PATCH(request, { params }) {
    const session = await getServerSession();
    if (!session) return unauthorized();
    
    const product = await prisma.product.findUnique({
        where: { id: params.id },
        include: { store: true }
    });
    
    // Verify ownership: User must own the store
    if (product.store.userId !== session.user.id) {
        return NextResponse.json(
            { error: 'You do not own this product' },
            { status: 403 }
        );
    }
    
    // Proceed with update
    const updated = await prisma.product.update({
        where: { id: params.id },
        data: await request.json()
    });
    
    return NextResponse.json(updated);
}
```

---

## Order Lifecycle

### Order Status Flow

```
┌─────────────────┐
│  ORDER_PLACED   │  Initial state when order created
└────────┬────────┘
         │
         │ Vendor clicks "Process"
         ↓
┌─────────────────┐
│   PROCESSING    │  Vendor is preparing the order
└────────┬────────┘
         │
         │ Vendor clicks "Ship"
         ↓
┌─────────────────┐
│     SHIPPED     │  Order is in transit
└────────┬────────┘
         │
         │ Vendor confirms delivery
         ↓
┌─────────────────┐
│    DELIVERED    │  Final state - customer can now rate
└─────────────────┘
```

### Detailed Order Lifecycle

#### Phase 1: Order Creation (Customer)

**Location:** `components/OrderSummary.jsx` (Lines 44-47)

```javascript
// Current Implementation (Client-side only)
const handlePlaceOrder = async (e) => {
    e.preventDefault();
    // ⚠️ NO SERVER VALIDATION
    // ⚠️ Price calculated client-side (insecure)
    router.push('/orders')  // Just navigates to orders page
}

// Planned Secure Implementation
const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    // 1. Validate required data
    if (!selectedAddress) {
        toast.error("Please select delivery address");
        return;
    }
    
    if (cartArray.length === 0) {
        toast.error("Cart is empty");
        return;
    }
    
    // 2. Send to server for validation & creation
    const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: cartArray.map(item => ({
                productId: item.id,
                quantity: item.quantity
            })),
            addressId: selectedAddress.id,
            paymentMethod: paymentMethod,
            couponCode: coupon?.code || null
        })
    });
    
    if (!response.ok) {
        const error = await response.json();
        toast.error(error.message);
        return;
    }
    
    const { orderId, paymentUrl } = await response.json();
    
    // 3. Handle payment
    if (paymentMethod === 'STRIPE') {
        window.location.href = paymentUrl;  // Redirect to Stripe
    } else {
        // Clear cart on successful COD order
        dispatch(clearCart());
        router.push(`/orders/${orderId}`);
    }
}
```

**Order Creation API** (`app/api/orders/create/route.js`)

```javascript
// Current: Only has validation schema (Lines 1-66)
// Planned full implementation:

export async function POST(request) {
    try {
        // 1. Authentication
        const session = await getServerSession();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }
        
        // 2. Validate input
        const body = await request.json();
        const validated = orderCreateSchema.safeParse(body);
        
        if (!validated.success) {
            return NextResponse.json(
                { error: validated.error.errors[0].message },
                { status: 400 }
            );
        }
        
        const { items, addressId, paymentMethod, couponCode } = validated.data;
        
        // 3. Fetch products with current prices
        const products = await prisma.product.findMany({
            where: { 
                id: { in: items.map(i => i.productId) },
                inStock: true  // Verify availability
            },
            include: { store: true }
        });
        
        if (products.length !== items.length) {
            return NextResponse.json(
                { error: 'Some products are unavailable' },
                { status: 400 }
            );
        }
        
        // 4. Calculate total SERVER-SIDE (prevent manipulation)
        let subtotal = 0;
        const orderItems = [];
        
        for (const item of items) {
            const product = products.find(p => p.id === item.productId);
            const itemTotal = product.price * item.quantity;
            subtotal += itemTotal;
            
            orderItems.push({
                productId: product.id,
                quantity: item.quantity,
                price: product.price  // Snapshot price at order time
            });
        }
        
        // 5. Apply coupon if provided
        let discount = 0;
        let couponDetails = {};
        
        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({
                where: { code: couponCode.toUpperCase() }
            });
            
            if (!coupon) {
                return NextResponse.json(
                    { error: 'Invalid coupon code' },
                    { status: 400 }
                );
            }
            
            // Validate coupon
            if (new Date(coupon.expiresAt) < new Date()) {
                return NextResponse.json(
                    { error: 'Coupon has expired' },
                    { status: 400 }
                );
            }
            
            // Check new user restriction
            if (coupon.forNewUser) {
                const existingOrders = await prisma.order.count({
                    where: { userId: session.user.id }
                });
                
                if (existingOrders > 0) {
                    return NextResponse.json(
                        { error: 'Coupon only valid for new users' },
                        { status: 400 }
                    );
                }
            }
            
            discount = (coupon.discount / 100) * subtotal;
            couponDetails = {
                code: coupon.code,
                discount: coupon.discount,
                description: coupon.description
            };
        }
        
        const total = subtotal - discount;
        
        // 6. Verify address ownership
        const address = await prisma.address.findFirst({
            where: {
                id: addressId,
                userId: session.user.id  // Ensure user owns address
            }
        });
        
        if (!address) {
            return NextResponse.json(
                { error: 'Invalid address' },
                { status: 400 }
            );
        }
        
        // 7. Create order in database
        const order = await prisma.order.create({
            data: {
                total,
                status: 'ORDER_PLACED',
                userId: session.user.id,
                storeId: products[0].store.id,  // Assume single store per order
                addressId: addressId,
                isPaid: false,
                paymentMethod,
                isCouponUsed: !!couponCode,
                coupon: couponDetails,
                orderItems: {
                    create: orderItems
                }
            },
            include: {
                orderItems: {
                    include: { product: true }
                },
                address: true
            }
        });
        
        // 8. Handle payment
        if (paymentMethod === 'STRIPE') {
            const paymentUrl = await createStripeCheckout(order);
            return NextResponse.json({ 
                orderId: order.id, 
                paymentUrl 
            });
        }
        
        // 9. Send confirmation email (planned)
        // await sendOrderConfirmation(order);
        
        return NextResponse.json({ 
            orderId: order.id,
            message: 'Order created successfully'
        });
        
    } catch (error) {
        console.error('Order creation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
```

#### Phase 2: Order Processing (Vendor)

**Location:** `app/store/orders/page.jsx` (Lines 17-37)

**Current Implementation:**
```javascript
const updateOrderStatus = async (orderId, status) => {
    // SECURITY: Define valid status transitions to prevent manipulation
    const validTransitions = {
        ORDER_PLACED: ['PROCESSING'],
        PROCESSING: ['SHIPPED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: []
    };

    const currentOrder = orders.find(o => o.id === orderId);
    
    if (currentOrder) {
        const allowed = validTransitions[currentOrder.status];
        if (!allowed.includes(status)) {
            toast.error(`Invalid status transition from ${currentOrder.status} to ${status}`);
            return;
        }
    }

    // Logic to update the status of an order  // ⚠️ NOT IMPLEMENTED
}
```

**Planned Secure Implementation:**
```javascript
const updateOrderStatus = async (orderId, status) => {
    try {
        const response = await fetch(`/api/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        // Update local state
        setOrders(orders.map(order => 
            order.id === orderId 
                ? { ...order, status, updatedAt: new Date() }
                : order
        ));
        
        toast.success('Order status updated');
        
    } catch (error) {
        toast.error(error.message);
    }
}

// Server-side: app/api/orders/[id]/status/route.js
export async function PATCH(request, { params }) {
    const session = await getServerSession();
    if (!session) return unauthorized();
    
    const { status } = await request.json();
    
    // 1. Fetch order with store info
    const order = await prisma.order.findUnique({
        where: { id: params.id },
        include: { store: true }
    });
    
    if (!order) {
        return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
        );
    }
    
    // 2. Verify ownership (vendor must own the store)
    if (order.store.userId !== session.user.id) {
        return NextResponse.json(
            { error: 'Unauthorized: Not your store' },
            { status: 403 }
        );
    }
    
    // 3. Validate status transition
    const validTransitions = {
        ORDER_PLACED: ['PROCESSING'],
        PROCESSING: ['SHIPPED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: []
    };
    
    const allowedStatuses = validTransitions[order.status];
    if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
            { error: `Cannot change from ${order.status} to ${status}` },
            { status: 400 }
        );
    }
    
    // 4. Update order status
    const updated = await prisma.order.update({
        where: { id: params.id },
        data: { 
            status,
            updatedAt: new Date()
        }
    });
    
    // 5. Trigger notifications (planned)
    // - Email customer: "Your order has been shipped"
    // - SMS notification
    // - Push notification
    
    // 6. If status is DELIVERED, enable reviews
    if (status === 'DELIVERED') {
        // Customer can now rate products
        // Send: "How was your order?" email
    }
    
    return NextResponse.json(updated);
}
```

**Vendor Order Management UI:**
```javascript
// app/store/orders/page.jsx (Lines 55-179)

// Features:
1. Order List Table
   - Customer name & email
   - Total amount
   - Payment method
   - Coupon usage indicator
   - Current status (with dropdown)
   - Order date

2. Status Update Dropdown
   - Shows only valid next states
   - Triggers validation on change
   - Real-time update

3. Order Detail Modal (Opens on row click)
   - Customer details (name, email, phone, full address)
   - Product list with images, quantities, prices
   - Payment info (method, paid status)
   - Coupon details if used
   - Current status & order date
```

#### Phase 3: Order Tracking (Customer)

**Location:** `app/(public)/orders/page.jsx`

```javascript
// Customer can view all their orders
const [orders, setOrders] = useState([]);

// ⚠️ PLACEHOLDER: Returns dummy data
useEffect(() => {
    setOrders(orderDummyData)
}, []);

// PLANNED IMPLEMENTATION:
useEffect(() => {
    const fetchOrders = async () => {
        const response = await fetch('/api/orders/my-orders');
        const data = await response.json();
        setOrders(data);
    };
    
    fetchOrders();
}, []);

// Server-side: app/api/orders/my-orders/route.js
export async function GET(request) {
    const session = await getServerSession();
    if (!session) return unauthorized();
    
    // Only return orders belonging to this user
    const orders = await prisma.order.findMany({
        where: { userId: session.user.id },
        include: {
            orderItems: {
                include: { product: true }
            },
            address: true,
            store: { select: { name: true, username: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(orders);
}
```

**Order Display Component** (`components/OrderItem.jsx`)

```javascript
// Displays each order with:
- Product images & names
- Quantities & prices
- Order date
- Delivery address
- Status badge (color-coded)
- Rate product button (if status === 'DELIVERED')

// Rating Feature (Lines 11-35)
const [ratingModal, setRatingModal] = useState(null);
const { ratings } = useSelector(state => state.rating);

// Customer can rate delivered products
{ratings.find(rating => order.id === rating.orderId && item.product.id === rating.productId)
    ? <Rating value={...} />  // Show existing rating
    : <button onClick={() => setRatingModal({ orderId, productId })}>
          Rate Product
      </button>
}
```

#### Phase 4: Product Rating (Post-Delivery)

**Location:** `components/RatingModal.jsx`

```javascript
// Opens when customer clicks "Rate Product"
const handleSubmit = (e) => {
    e.preventDefault();
    
    // ⚠️ CURRENT: Stores in Redux only (not persisted)
    dispatch(addRating({
        orderId: ratingModal.orderId,
        productId: ratingModal.productId,
        rating: rating,
        review: review
    }));
    
    // PLANNED: Submit to backend
    const response = await fetch('/api/ratings/create', {
        method: 'POST',
        body: JSON.stringify({
            orderId: ratingModal.orderId,
            productId: ratingModal.productId,
            rating: rating,
            review: review
        })
    });
    
    toast.success("Thank you for your feedback!");
    setRatingModal(null);
}

// Server-side: app/api/ratings/create/route.js
export async function POST(request) {
    const session = await getServerSession();
    if (!session) return unauthorized();
    
    const { orderId, productId, rating, review } = await request.json();
    
    // 1. Verify customer ordered this product
    const orderItem = await prisma.orderItem.findFirst({
        where: {
            orderId,
            productId,
            order: {
                userId: session.user.id,  // Belongs to user
                status: 'DELIVERED'        // Is delivered
            }
        }
    });
    
    if (!orderItem) {
        return NextResponse.json(
            { error: 'You can only rate delivered products you purchased' },
            { status: 403 }
        );
    }
    
    // 2. Check if already rated
    const existing = await prisma.rating.findUnique({
        where: {
            userId_productId_orderId: {
                userId: session.user.id,
                productId,
                orderId
            }
        }
    });
    
    if (existing) {
        return NextResponse.json(
            { error: 'You have already rated this product' },
            { status: 400 }
        );
    }
    
    // 3. Create rating
    const newRating = await prisma.rating.create({
        data: {
            rating,
            review,
            userId: session.user.id,
            productId,
            orderId
        }
    });
    
    return NextResponse.json(newRating);
}
```

### Order State Machine Summary

```javascript
// Valid state transitions
const ORDER_STATE_MACHINE = {
    ORDER_PLACED: {
        canTransitionTo: ['PROCESSING'],
        actor: 'VENDOR',
        color: 'slate',
        description: 'Order received, awaiting vendor confirmation'
    },
    PROCESSING: {
        canTransitionTo: ['SHIPPED'],
        actor: 'VENDOR',
        color: 'yellow',
        description: 'Vendor is preparing your order'
    },
    SHIPPED: {
        canTransitionTo: ['DELIVERED'],
        actor: 'VENDOR',
        color: 'blue',
        description: 'Order is on its way to you'
    },
    DELIVERED: {
        canTransitionTo: [],
        actor: 'CUSTOMER',
        color: 'green',
        description: 'Order delivered successfully',
        enablesRating: true
    }
};

// Authorization rules
const canUpdateOrderStatus = (order, user) => {
    // Only vendor who owns the store can update
    if (user.role !== 'VENDOR') return false;
    if (order.store.userId !== user.id) return false;
    if (order.status === 'DELIVERED') return false;  // Final state
    return true;
};
```

---

## Payment Lifecycle

### Current State: ⚠️ **NOT IMPLEMENTED**

**What exists:**
- Payment method selection UI (COD/STRIPE)
- Order creation endpoint structure
- Price calculation validation (server-side schema)

**What's missing:**
- Stripe API integration
- Payment gateway webhooks
- Payment confirmation flow
- Refund handling
- Transaction logging

### Planned Payment Flow

#### Payment Method: Cash on Delivery (COD)

```
1. Customer selects "COD" in OrderSummary
   ↓
2. Customer clicks "Place Order"
   ↓
3. Order created with:
   - paymentMethod: "COD"
   - isPaid: false
   ↓
4. Customer redirected to /orders
   ↓
5. Vendor ships product
   ↓
6. Delivery person collects cash
   ↓
7. Vendor marks order as "DELIVERED"
   ↓
8. Payment complete (no online transaction)
```

**Implementation (COD is simpler, requires less code):**
```javascript
// components/OrderSummary.jsx
const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    const response = await fetch('/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({
            items: cartArray,
            addressId: selectedAddress.id,
            paymentMethod: 'COD',  // Cash on Delivery
            couponCode: coupon?.code
        })
    });
    
    const { orderId } = await response.json();
    
    // No payment processing needed for COD
    dispatch(clearCart());
    router.push(`/orders/${orderId}`);
}
```

#### Payment Method: Stripe (Online Payment)

```
1. Customer selects "STRIPE" in OrderSummary
   ↓
2. Customer clicks "Place Order"
   ↓
3. Backend creates Stripe Checkout Session
   ↓
4. Customer redirected to Stripe payment page
   ↓
5. Customer enters card details on Stripe
   ↓
6. Stripe processes payment
   ↓
7. Stripe webhook notifies our backend
   ↓
8. Backend updates order:
   - isPaid: true
   - status: "ORDER_PLACED"
   ↓
9. Customer redirected to success page
   ↓
10. Vendor can now process order
```

**Planned Stripe Integration:**

##### Step 1: Install Stripe SDK
```bash
npm install stripe @stripe/stripe-js
```

##### Step 2: Configure Stripe
```javascript
// lib/stripe.js (To Be Created)
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16'
});
```

##### Step 3: Create Checkout Session
```javascript
// app/api/orders/create/route.js (Addition to existing endpoint)

// After creating order in database:
if (paymentMethod === 'STRIPE') {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: order.orderItems.map(item => ({
            price_data: {
                currency: 'usd',
                product_data: {
                    name: item.product.name,
                    images: [item.product.images[0]]
                },
                unit_amount: Math.round(item.price * 100)  // Convert to cents
            },
            quantity: item.quantity
        })),
        customer_email: session.user.email,
        client_reference_id: order.id,  // Link to our order
        success_url: `${process.env.NEXT_PUBLIC_URL}/orders/${order.id}?payment=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_URL}/cart?payment=cancelled`,
        metadata: {
            orderId: order.id,
            userId: session.user.id
        }
    });
    
    return NextResponse.json({ 
        orderId: order.id,
        paymentUrl: session.url  // Stripe checkout page
    });
}
```

##### Step 4: Handle Stripe Webhooks
```javascript
// app/api/webhooks/stripe/route.js (To Be Created)
import { stripe } from '@/lib/stripe';
import { buffer } from 'micro';

export const config = {
    api: {
        bodyParser: false  // Required for webhook signature verification
    }
};

export async function POST(request) {
    const buf = await buffer(request);
    const sig = request.headers.get('stripe-signature');
    
    let event;
    
    try {
        // Verify webhook signature
        event = stripe.webhooks.constructEvent(
            buf,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    // Handle different event types
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            
            // Update order as paid
            await prisma.order.update({
                where: { id: session.metadata.orderId },
                data: {
                    isPaid: true,
                    paymentMethod: 'STRIPE',
                    updatedAt: new Date()
                }
            });
            
            // Send confirmation email
            // await sendPaymentConfirmation(session.metadata.orderId);
            
            break;
            
        case 'payment_intent.payment_failed':
            const failedPayment = event.data.object;
            
            // Mark order as payment failed
            await prisma.order.update({
                where: { id: failedPayment.metadata.orderId },
                data: {
                    status: 'PAYMENT_FAILED',
                    updatedAt: new Date()
                }
            });
            
            // Notify customer
            // await sendPaymentFailedEmail(failedPayment.metadata.orderId);
            
            break;
            
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
}
```

##### Step 5: Handle Success/Cancel Redirects
```javascript
// app/orders/[id]/page.jsx (To Be Created)
'use client'
import { useSearchParams } from 'next/navigation';

export default function OrderConfirmation({ params }) {
    const searchParams = useSearchParams();
    const paymentStatus = searchParams.get('payment');
    
    useEffect(() => {
        if (paymentStatus === 'success') {
            toast.success('Payment successful! Your order is confirmed.');
            dispatch(clearCart());  // Clear cart after successful payment
        } else if (paymentStatus === 'cancelled') {
            toast.error('Payment cancelled. Your order is still pending.');
        }
    }, [paymentStatus]);
    
    // Display order details...
}
```

### Payment Security Measures

#### 1. Server-Side Price Calculation (✅ Implemented in validation)
```javascript
// lib/validation.js (Lines 1-66)
// Ensures client cannot manipulate prices

// ❌ WRONG (Client-side price, easily manipulated):
const total = cartItems.reduce((sum, item) => sum + item.clientPrice, 0);

// ✅ CORRECT (Server validates & calculates):
export async function POST(request) {
    const { items } = await request.json();
    
    // Fetch ACTUAL prices from database
    const products = await prisma.product.findMany({
        where: { id: { in: items.map(i => i.id) } }
    });
    
    // Calculate using DATABASE prices, not client-provided prices
    const total = products.reduce((sum, p) => {
        const quantity = items.find(i => i.id === p.id).quantity;
        return sum + (p.price * quantity);
    }, 0);
}
```

#### 2. Idempotency (Planned)
```javascript
// Prevent duplicate charges if user clicks "Pay" multiple times

export async function POST(request) {
    const { idempotencyKey } = await request.json();
    
    // Check if order already created with this key
    const existing = await prisma.order.findFirst({
        where: { idempotencyKey }
    });
    
    if (existing) {
        return NextResponse.json({ 
            orderId: existing.id,
            message: 'Order already created'
        });
    }
    
    // Create order with idempotency key
    const order = await prisma.order.create({
        data: {
            idempotencyKey,
            // ... other fields
        }
    });
}
```

#### 3. Payment Intent Tracking (Stripe Best Practice)
```javascript
// Store Stripe Payment Intent ID for refund capability

const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(total * 100),
    currency: 'usd',
    metadata: {
        orderId: order.id
    }
});

await prisma.order.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: paymentIntent.id }
});

// Later: Refund capability
const refund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    amount: Math.round(refundAmount * 100)
});
```

#### 4. Webhook Signature Verification (Planned)
```javascript
// Ensures webhooks actually come from Stripe

const event = stripe.webhooks.constructEvent(
    buf,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET  // Secret from Stripe dashboard
);

// If signature invalid, reject request
// Prevents attackers from faking payment confirmations
```

### Payment Error Handling

```javascript
// Planned error scenarios

try {
    const order = await createOrder(data);
    const payment = await processPayment(order);
    return success(order);
    
} catch (error) {
    if (error.type === 'StripeCardError') {
        // Card declined
        return { error: 'Payment declined. Please try another card.' };
    }
    
    if (error.type === 'StripeInvalidRequestError') {
        // Invalid parameters
        return { error: 'Payment failed. Please contact support.' };
    }
    
    if (error.code === 'insufficient_funds') {
        return { error: 'Insufficient funds on card.' };
    }
    
    // Unknown error - log and notify admin
    console.error('Payment error:', error);
    await notifyAdmin(error);
    return { error: 'Payment failed. Please try again later.' };
}
```

---

## Data Flow Diagrams

### 1. User Registration & Store Creation Flow

```
Customer Journey:
    ↓
[Browse Products] → No account needed
    ↓
[Want to Buy] → Must login/register
    ↓
[Complete Purchase] → Order placed
    ↓
[Want to Sell] → Apply for store
    ↓
[Fill Application] → /create-store form
    ↓
[Submit Application] → Store status: "pending"
    ↓
[Wait for Admin] ⏳
    ↓
Admin Approval:
    ↓
[Admin Dashboard] → /admin/approve
    ↓
[Review Application] → Check store details
    ↓
[Approve ✓ or Reject ✗]
    ↓
If Approved:
    Store status: "approved"
    Store isActive: true
    User can access /store dashboard
    Store appears on /shop
    ↓
If Rejected:
    Store status: "rejected"
    User notified
    Can reapply
```

### 2. Product Purchase Flow

```
┌──────────────┐
│   Customer   │
└──────┬───────┘
       │
       │ 1. Browse /shop or /shop/[username]
       ↓
┌──────────────────┐
│  Product Listing │
└──────┬───────────┘
       │
       │ 2. Click product → /product/[id]
       ↓
┌──────────────────┐
│ Product Details  │
│  - Images        │
│  - Price         │
│  - Description   │
│  - Reviews       │
└──────┬───────────┘
       │
       │ 3. Click "Add to Cart"
       ↓
┌──────────────────┐
│  Redux Store     │
│  cart.cartItems  │
│  [prodId]: qty   │
└──────┬───────────┘
       │
       │ 4. Navigate to /cart
       ↓
┌──────────────────┐
│   Cart Page      │
│  - Item list     │
│  - Quantities    │
│  - Subtotal      │
└──────┬───────────┘
       │
       │ 5. Click "Place Order"
       ↓
┌──────────────────┐
│  Order Summary   │
│  - Select Address│
│  - Payment method│
│  - Apply Coupon  │
└──────┬───────────┘
       │
       │ 6. Submit order
       ↓
┌──────────────────────┐
│  Backend Processing  │
│  1. Validate input   │
│  2. Calculate price  │
│  3. Check inventory  │
│  4. Apply coupon     │
│  5. Create order     │
│  6. Process payment  │
└──────┬───────────────┘
       │
       ├─ COD → Order created
       │         isPaid: false
       │
       └─ Stripe → Redirect to payment
                    ↓
             [Stripe Checkout]
                    ↓
             Payment success
                    ↓
             Webhook updates order
             isPaid: true
                    ↓
┌──────────────────────┐
│  Order Confirmed     │
│  Status: ORDER_PLACED│
└──────┬───────────────┘
       │
       │ Customer views in /orders
       │ Vendor sees in /store/orders
       ↓
   [Order Lifecycle continues...]
```

### 3. Vendor Order Fulfillment Flow

```
┌──────────────┐
│    Vendor    │
└──────┬───────┘
       │
       │ 1. Login to /store
       ↓
┌──────────────────┐
│ Store Dashboard  │
│  - Total Orders  │
│  - Revenue       │
│  - Reviews       │
└──────┬───────────┘
       │
       │ 2. Navigate to /store/orders
       ↓
┌──────────────────────────┐
│     Order List           │
│  [Filter: ORDER_PLACED]  │
└──────┬───────────────────┘
       │
       │ 3. Click order to view details
       ↓
┌──────────────────────────┐
│   Order Detail Modal     │
│  - Customer info         │
│  - Product list          │
│  - Delivery address      │
│  - Payment status        │
└──────┬───────────────────┘
       │
       │ 4. Change status to "PROCESSING"
       ↓
┌──────────────────────────┐
│  Status: PROCESSING      │
│  (Vendor prepares order) │
└──────┬───────────────────┘
       │
       │ 5. Package & ship order
       │    Change status to "SHIPPED"
       ↓
┌──────────────────────────┐
│  Status: SHIPPED         │
│  (In transit)            │
│  - Customer notified     │
└──────┬───────────────────┘
       │
       │ 6. Delivery confirmation
       │    Change status to "DELIVERED"
       ↓
┌──────────────────────────┐
│  Status: DELIVERED       │
│  - Customer can rate     │
│  - Payment cleared (COD) │
└────────────────────────────┘
```

### 4. Admin Platform Management Flow

```
┌──────────────┐
│    Admin     │
└──────┬───────┘
       │
       │ Login to /admin
       ↓
┌──────────────────────────┐
│   Admin Dashboard        │
│  - Platform analytics    │
│  - Revenue graphs        │
│  - Total stores/products │
└──────┬───────────────────┘
       │
       ├─────────────────────────────┐
       │                             │
       │ /admin/approve              │ /admin/stores
       ↓                             ↓
┌──────────────────┐      ┌──────────────────┐
│ Pending Stores   │      │  Active Stores   │
│  - Review apps   │      │  - Toggle active │
│  - Approve/Reject│      │  - View details  │
└──────────────────┘      └──────────────────┘
       │                             
       │ Approve store               
       ↓                             
┌──────────────────┐                
│  Store Status    │                
│  pending →       │                
│  approved        │                
│  isActive: true  │                
└──────────────────┘                
       │                             
       │ Store appears on /shop      
       │ Vendor gains access         
       ↓                             
┌──────────────────┐                
│ Vendor Dashboard │                
│  /store          │                
└──────────────────┘                
       │
       │ /admin/coupons
       ↓
┌──────────────────┐
│  Coupon Manager  │
│  - Create coupon │
│  - Set discount  │
│  - Expiry date   │
│  - Delete old    │
└──────────────────┘
```

---

## Current State & Limitations

### ✅ What's Implemented

1. **UI/UX Complete**
   - All pages designed and functional
   - Responsive design (mobile-friendly)
   - Component library established
   - Navigation flows working

2. **State Management**
   - Redux Toolkit configured
   - Cart management (add, remove, clear)
   - Product listing (from dummy data)
   - Address management (in-memory)
   - Rating storage (in-memory)

3. **Security Hardening**
   - Input validation with Zod
   - File upload restrictions
   - HTTP security headers
   - CSRF protection (Next.js built-in)
   - Order status validation logic

4. **Database Schema**
   - Prisma schema complete
   - All models defined with relations
   - Secure ID generation (CUID)
   - Unique constraints on critical fields

5. **Routing**
   - App Router structure
   - Dynamic routes ([id], [username])
   - Role-based route groups
   - Middleware structure in place

### ⚠️ What's NOT Implemented (Uses Dummy Data)

1. **Authentication**
   - No login/signup system
   - No session management
   - No password hashing
   - Layout components always return `isAdmin = true` or `isSeller = true`

2. **Backend API**
   - All fetch functions are placeholders: `// Logic to...`
   - No actual database queries
   - Uses hardcoded dummy data from `assets/assets.js`
   - One API endpoint created but only has validation

3. **Payment Processing**
   - No Stripe integration
   - No payment webhooks
   - No transaction logging
   - Order creation redirects to orders page without payment

4. **File Storage**
   - File upload validation exists
   - But no actual upload to server/cloud storage
   - Images stored in `public/` folder only

5. **Email Notifications**
   - No email service configured
   - No order confirmations
   - No status update notifications

6. **Real-time Features**
   - No WebSocket connections
   - No live order updates
   - No inventory sync

### 🔧 Development Workflow

To make this production-ready, developers need to:

#### Phase 1: Authentication Setup
```bash
npm install next-auth @auth/prisma-adapter bcryptjs
```
- Configure NextAuth.js
- Create login/signup pages
- Implement password hashing
- Set up session management
- Update middleware with real session checks
- Update layout components to check actual user roles

#### Phase 2: Database Connection
```bash
# Set up PostgreSQL database
# Add to .env:
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Run migrations
npx prisma generate
npx prisma db push
```

#### Phase 3: API Implementation
Replace all placeholder functions:
```javascript
// BEFORE (Current):
const fetchProducts = async () => {
    // Logic to fetch products
    setProducts(dummyData)
}

// AFTER (To Implement):
const fetchProducts = async () => {
    const response = await fetch('/api/products');
    const data = await response.json();
    setProducts(data);
}

// Create: app/api/products/route.js
export async function GET() {
    const products = await prisma.product.findMany({
        include: { store: true }
    });
    return NextResponse.json(products);
}
```

#### Phase 4: Payment Integration
```bash
npm install stripe @stripe/stripe-js
```
- Set up Stripe account
- Configure webhook endpoint
- Implement checkout session creation
- Handle payment confirmations
- Test with Stripe test cards

#### Phase 5: File Upload
```bash
npm install uploadthing  # Or use AWS S3
```
- Configure cloud storage
- Implement signed upload URLs
- Add image processing (resize, optimize)
- Update product/store creation to upload files

#### Phase 6: Notifications
```bash
npm install nodemailer  # Or use SendGrid/Resend
```
- Configure email service
- Create email templates
- Implement order confirmations
- Add status update emails

### 📊 Dummy Data Structure

All current data comes from `assets/assets.js`:

```javascript
// Example structures:
export const productDummyData = [
    {
        id: "prod_1",
        name: "Product Name",
        description: "...",
        mrp: 100,
        price: 80,
        images: ["/path/to/image.png"],
        category: "Electronics",
        inStock: true,
        storeId: "store_1"
    }
];

export const orderDummyData = [
    {
        id: "order_1",
        total: 250,
        status: "ORDER_PLACED",
        userId: "user_1",
        storeId: "store_1",
        addressId: "addr_1",
        isPaid: false,
        paymentMethod: "COD",
        isCouponUsed: false,
        coupon: {},
        orderItems: [...],
        user: {...},
        address: {...},
        createdAt: Date
    }
];

// Similar structures for:
// - addressDummyData
// - couponDummyData
// - storesDummyData
// - dummyStoreData
// - dummyAdminDashboardData
// - dummyStoreDashboardData
```

### 🚀 Next Steps for Developers

**Priority 1 (Critical for Launch):**
1. Implement authentication (NextAuth.js)
2. Connect to real database (Prisma + PostgreSQL)
3. Replace all dummy data with API calls
4. Implement payment processing (Stripe)
5. Test order flow end-to-end

**Priority 2 (Important for Production):**
1. Implement file upload to cloud storage
2. Add email notifications
3. Implement rate limiting
4. Add comprehensive error handling
5. Set up logging and monitoring

**Priority 3 (Nice to Have):**
1. Add real-time order updates
2. Implement search functionality
3. Add product filtering
4. Create admin analytics dashboard
5. Implement refund workflow

---

## Conclusion

This e-commerce platform has a **solid architectural foundation** with:
- Well-structured component hierarchy
- Clean separation of concerns (customer/vendor/admin)
- Secure validation and headers in place
- Comprehensive database schema
- Clear state management patterns

However, it is currently in a **development/prototype phase** and requires:
- Authentication implementation
- Backend API development
- Payment gateway integration
- Production testing and optimization

The codebase is ready for these implementations, with placeholders clearly marked and security considerations already applied where possible.

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-17  
**Status:** Pre-Production Development  
**Next Review:** After authentication implementation