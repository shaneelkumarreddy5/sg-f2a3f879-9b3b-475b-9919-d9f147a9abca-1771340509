-- Add role column to profiles table for user role separation
ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'VENDOR', 'ADMIN'));