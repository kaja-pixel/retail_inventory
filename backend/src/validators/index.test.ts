import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  ProductSchema,
  ProductUpdateSchema,
  RegisterSchema,
  ResetPasswordSchema,
  StockAdjustmentSchema,
  UpdateProfileSchema,
  UserRoleUpdateSchema,
  UserStatusUpdateSchema,
} from './index.js';

const validRegistration = {
  fullName: 'Retail Staff',
  email: 'staff@example.com',
  password: 'StrongPass123',
  confirmPassword: 'StrongPass123',
};

test('registration accepts a valid staff account without a caller-selected role', () => {
  assert.equal(RegisterSchema.safeParse(validRegistration).success, true);
});

test('registration rejects mismatched confirmations and caller-selected roles', () => {
  assert.equal(
    RegisterSchema.safeParse({ ...validRegistration, confirmPassword: 'DifferentPass123' }).success,
    false
  );
  assert.equal(RegisterSchema.safeParse({ ...validRegistration, role: 'SUPER_ADMIN' }).success, false);
});

test('registration enforces a strong password policy', () => {
  assert.equal(RegisterSchema.safeParse({ ...validRegistration, password: 'weakpass' }).success, false);
});

test('login and password reset require valid email addresses and passwords', () => {
  assert.equal(LoginSchema.safeParse({ email: 'staff@example.com', password: 'x' }).success, true);
  assert.equal(LoginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success, false);
  assert.equal(ForgotPasswordSchema.safeParse({ email: 'staff@example.com' }).success, true);
  assert.equal(ForgotPasswordSchema.safeParse({ email: 'not-an-email' }).success, false);
  assert.equal(
    ResetPasswordSchema.safeParse({ token: 'reset-token', newPassword: 'StrongPass123' }).success,
    true
  );
  assert.equal(
    ResetPasswordSchema.safeParse({ token: '', newPassword: 'StrongPass123' }).success,
    false
  );
  assert.equal(
    ResetPasswordSchema.safeParse({ token: 'reset-token', newPassword: 'weakpass' }).success,
    false
  );
});

test('profile and password changes cannot include privileged fields', () => {
  assert.equal(UpdateProfileSchema.safeParse({ fullName: 'Retail Staff' }).success, true);
  assert.equal(
    UpdateProfileSchema.safeParse({ fullName: 'Retail Staff', role: 'SUPER_ADMIN' }).success,
    false
  );
  assert.equal(
    ChangePasswordSchema.safeParse({
      currentPassword: 'CurrentPass123',
      newPassword: 'NewStrongPass123',
    }).success,
    true
  );
  assert.equal(
    ChangePasswordSchema.safeParse({
      currentPassword: 'CurrentPass123',
      newPassword: 'weakpass',
    }).success,
    false
  );
});

test('product creation accepts zero stock and zero threshold but rejects negative values', () => {
  const product = {
    name: 'Test Product',
    sku: 'TEST-001',
    categoryId: 1,
    unitPrice: 1,
    stockQuantity: 0,
    lowStockThreshold: 0,
  };
  assert.equal(ProductSchema.safeParse(product).success, true);
  assert.equal(ProductSchema.safeParse({ ...product, unitPrice: -1 }).success, false);
  assert.equal(ProductSchema.safeParse({ ...product, stockQuantity: -1 }).success, false);
});

test('product edits cannot bypass audited stock adjustment', () => {
  assert.equal(ProductUpdateSchema.safeParse({ name: 'Updated name' }).success, true);
  assert.equal(ProductUpdateSchema.safeParse({ stockQuantity: 42 }).success, false);
});

test('stock adjustments reject zero changes', () => {
  const adjustment = {
    productId: 'a0000000-0000-0000-0000-000000000001',
    transactionType: 'RESTOCK',
    quantityChange: 1,
    reason: 'Supplier delivery',
  };
  assert.equal(StockAdjustmentSchema.safeParse(adjustment).success, true);
  assert.equal(StockAdjustmentSchema.safeParse({ ...adjustment, quantityChange: 0 }).success, false);
});

test('role and account status updates accept only valid values', () => {
  assert.equal(UserRoleUpdateSchema.safeParse({ roleId: 1 }).success, true);
  assert.equal(UserRoleUpdateSchema.safeParse({ roleId: 4 }).success, false);
  assert.equal(UserStatusUpdateSchema.safeParse({ status: 'INACTIVE' }).success, true);
  assert.equal(UserStatusUpdateSchema.safeParse({ status: 'DELETED' }).success, false);
});
