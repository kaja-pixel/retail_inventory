import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validateBody = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map((issue) => issue.message).join(', ');
        res.status(400).json({
          success: false,
          message: errorMessages,
          errors: error.issues,
        });
        return;
      }
      next(error);
    }
  };
};

// 1. Auth Schemas
export const RegisterSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address is required').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Password must include lowercase, uppercase, and numeric characters'),
  confirmPassword: z.string(),
}).strict().refine((data) => {
  if (data.confirmPassword && data.password !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const LoginSchema = z.object({
  email: z.string().email('Valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Password must include lowercase, uppercase, and numeric characters'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, 'Password must include lowercase, uppercase, and numeric characters'),
}).strict();

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
}).strict();

// 2. Product Schemas
export const ProductSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(255),
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(100),
  categoryId: z.number().int().positive('Category is required'),
  description: z.string().optional().nullable(),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  stockQuantity: z.number().int().min(0, 'Stock quantity cannot be negative').default(0),
  lowStockThreshold: z.number().int().min(0, 'Low-stock threshold cannot be negative').default(10),
}).strict();

export const ProductUpdateSchema = z.object({
  name: z.string().min(2, 'Product name must be at least 2 characters').max(255).optional(),
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(100).optional(),
  categoryId: z.number().int().positive('Category is required').optional(),
  description: z.string().optional().nullable(),
  unitPrice: z.number().min(0, 'Unit price cannot be negative').optional(),
  lowStockThreshold: z.number().int().min(0, 'Low-stock threshold cannot be negative').optional(),
}).strict();

// UUID regex that accepts any variant (v1-v5, nil, and custom UUIDs used in seed data)
const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// 3. Inventory Adjustment Schema
export const StockAdjustmentSchema = z.object({
  productId: z.string().regex(uuidRegex, 'Valid product UUID is required'),
  transactionType: z.enum(['RESTOCK', 'DAMAGE', 'LOSS', 'SALE', 'RETURN', 'ADJUSTMENT']),
  quantityChange: z.number().int().refine((val) => val !== 0, 'Quantity change cannot be zero'),
  reason: z.string().min(2, 'Reason must be at least 2 characters').max(255),
  notes: z.string().max(1000).optional().nullable(),
});

// 4. User Role and Status Schemas
export const UserRoleUpdateSchema = z.object({
  roleId: z.number().int().min(1).max(3),
});

export const UserStatusUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
