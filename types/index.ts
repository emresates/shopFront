export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
export interface ApiResponse<T> {
  data: T;
  message?: string | null;
  errCode?: string | null;
  statusCode: number;
  pagination?: PaginationMeta | null;
}
export interface ProductImage {
  id: number;
  imageUrl: string;
  isMain: boolean;
}
export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  createdAt: string;
  categoryId: number;
  categoryName: string;
  images: ProductImage[];
}
export type ProductInput = Pick<
  Product,
  "name" | "description" | "price" | "stock" | "categoryId"
>;
export interface Category {
  id: number;
  name: string;
  productCount: number;
}
export interface Favorite {
  productId: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId: number;
  categoryName: string;
  mainImageUrl?: string | null;
  favoritedAt: string;
}
export interface CartItem {
  id: number;
  productId: number;
  productName: string;
  mainImageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stock: number;
}
export interface Cart {
  id: number;
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
}
export interface Address {
  id: number;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  addressLine: string;
  postalCode?: string | null;
  isDefault: boolean;
}
export type AddressInput = Omit<Address, "id">;
export interface OrderItem {
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}
export type OrderStatus =
  "Pending" | "Paid" | "Preparing" | "Shipped" | "Delivered" | "Cancelled";
export interface Order {
  id: number;
  status: OrderStatus;
  totalPrice: number;
  shippingFullName: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingAddressLine: string;
  createdAt: string;
  items: OrderItem[];
}
export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  expiresAt: number;
}
