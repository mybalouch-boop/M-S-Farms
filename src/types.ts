export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'customer' | 'delivery' | 'admin' | 'inventory_manager' | 'delivery_manager';
  address?: string;
  location?: { lat: number; lng: number };
  walletBalance: number;
  createdAt: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  planType: 'daily' | 'alternate' | 'custom';
  quantity: number;
  status: 'active' | 'paused' | 'cancelled';
  customDays?: string[];
  startDate: string;
  nextDeliveryDate: string;
}

export interface DeliveryOrder {
  id: string;
  subscriptionId?: string;
  customerId: string;
  customerName?: string;
  customerAddress?: string;
  deliveryStaffId?: string;
  date: string;
  quantity: number;
  status: 'pending' | 'delivered' | 'missed' | 'cancelled';
  deliveredAt?: string;
  location?: { lat: number; lng: number };
}

export interface Transaction {
  id: string;
  customerId: string;
  amount: number;
  type: 'recharge' | 'deduction';
  description?: string;
  timestamp: string;
  orderId?: string;
}

export interface Inventory {
  id: string;
  date: string;
  productionLiters: number;
  deliveredLiters?: number;
  wastageLiters?: number;
  outletStock?: number;
}
