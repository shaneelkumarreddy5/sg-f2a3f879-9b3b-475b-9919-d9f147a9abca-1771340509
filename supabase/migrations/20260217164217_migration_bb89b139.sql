-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert categories seed data if table is empty
INSERT INTO public.categories (name, slug, description, icon)
VALUES 
  ('Electronics', 'electronics', 'Electronic devices and gadgets', '💻'),
  ('Clothing', 'clothing', 'Fashion and apparel', '👕'),
  ('Home and Kitchen', 'home-kitchen', 'Home appliances and kitchen items', '🏠'),
  ('Beauty and Personal Care', 'beauty-personal-care', 'Beauty products and personal care items', '💄'),
  ('Sports and Outdoors', 'sports-outdoors', 'Sports equipment and outdoor gear', '⚽'),
  ('Books and Media', 'books-media', 'Books, music, and entertainment', '📚'),
  ('Toys and Games', 'toys-games', 'Toys and games for all ages', '🎮'),
  ('Health and Wellness', 'health-wellness', 'Health supplements and wellness products', '💊'),
  ('Automotive', 'automotive', 'Car accessories and automotive parts', '🚗'),
  ('Food and Beverages', 'food-beverages', 'Food items and beverages', '🍔')
ON CONFLICT (name) DO NOTHING;