import { z } from 'zod';

// SECURITY: Centralized validation schemas to prevent injection and invalid data

export const storeSchema = z.object({
    username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscore allowed"),
    name: z.string().min(3).max(50).trim(),
    description: z.string().min(10).max(500).trim(),
    email: z.string().email(),
    contact: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),
    address: z.string().min(5).max(200),
});

export const productSchema = z.object({
    name: z.string().min(3).max(100).trim(),
    description: z.string().min(10).max(1000).trim(),
    mrp: z.coerce.number().positive().max(999999),
    price: z.coerce.number().positive().max(999999),
    category: z.string().min(1, "Category is required"),
}).refine((data) => data.price <= data.mrp, {
    message: "Offer price cannot be higher than MRP",
    path: ["price"]
});

// SECURITY: File validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const validateFile = (file) => {
    if (!file) return null;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
    }
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File too large. Max size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    return true;
};