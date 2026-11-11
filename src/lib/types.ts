export type UserRole = 'customer' | 'vendor' | 'admin';
export type VendorStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type ProductStatus = 'draft' | 'active' | 'archived';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'cod';
export type CommissionScope = 'global' | 'vendor' | 'category' | 'brand' | 'product';
export type CommissionType = 'percentage' | 'fixed';

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  locale: 'en' | 'bn';
  created_at: string;
}

export interface Vendor {
  id: string;
  owner_id: string;
  shop_name: string;
  shop_slug: string;
  description: string | null;
  phone: string | null;
  status: VendorStatus;
  commission_override: number | null;
  created_at: string;
}

export interface Category {
  id: string;
  name_en: string;
  name_bn: string;
  slug: string;
  parent_id: string | null;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  vendor_id: string;
  category_id: string | null;
  brand_id: string | null;
  title_en: string;
  title_bn: string | null;
  description_en: string | null;
  description_bn: string | null;
  slug: string;
  price: number;
  compare_price: number | null;
  stock: number;
  sku: string | null;
  status: ProductStatus;
  images: string[] | null;
  created_at: string;
  vendors?: Vendor;
  categories?: Category;
  brands?: Brand;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  products?: Product;
}

export interface SuborderItem {
  id: string;
  suborder_id: string;
  product_id: string;
  title: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Suborder {
  id: string;
  order_id: string;
  vendor_id: string;
  status: OrderStatus;
  subtotal: number;
  commission_amount: number;
  vendor_earning: number;
  items?: SuborderItem[];
  vendors?: Vendor;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  created_at: string;
  suborders?: Suborder[];
}

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: { full_name: string };
}

export interface CommissionRule {
  id: string;
  scope: CommissionScope;
  scope_id: string | null;
  commission_type: CommissionType;
  value: number;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
}
