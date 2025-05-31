
export interface Product {
  id: string;
  name: string;
  sku: string;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  imageUrl?: string;
  createdAt?: string; // Optional: often returned by backend
  updatedAt?: string; // Optional: often returned by backend
}

export type TransactionType = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'paid' | 'overdue';

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string; // ISO string format: YYYY-MM-DD
  description: string;
  amount: number; // Always positive
  category: string;
  productId?: string; // Optional: links to a product
  productName?: string; // Optional: backend might join product name
  quantity?: number;  // Optional: quantity of product for this transaction
  dueDate?: string; // Optional: For A/R and A/P
  status?: TransactionStatus; // Optional: e.g., 'pending', 'paid', 'overdue'
  paymentDate?: string; // Optional: Date when a 'pending' item was paid
  createdAt?: string; // Optional: often returned by backend
  updatedAt?: string; // Optional: often returned by backend
}

export interface AppState {
  products: Product[];
  transactions: Transaction[];
  activeView: ViewName;
  isLoading: boolean; // For global loading state, e.g., initial load
  error: string | null; // For global error messages
}

export type ViewName = 'dashboard' | 'dataEntry' | 'reports' | 'accountsReceivable' | 'accountsPayable' | 'inventoryList';

export type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_VIEW'; payload: ViewName }
  // The following actions will now primarily trigger API calls via context functions.
  // The reducer might not directly handle complex state changes for these if we re-fetch.
  | { type: 'ADD_PRODUCT'; payload: Product } // Kept for potential optimistic updates, but API call is primary
  | { type: 'UPDATE_PRODUCT_STOCK'; payload: { productId: string; change: number } } // Less used, backend handles most stock.
  | { type: 'ADD_TRANSACTION'; payload: Transaction } // Kept for potential optimistic updates
  | { type: 'MARK_TRANSACTION_AS_PAID'; payload: { transactionId: string; paymentDate: string } }; // Kept for potential optimistic updates

export interface ChartDataPoint {
  name: string;
  income?: number;
  expense?: number;
  balance?: number;
}

export const TRANSACTION_CATEGORIES = {
  INCOME: ['Venta de Producto', 'Servicios', 'Factura Emitida', 'Otros Ingresos'],
  EXPENSE: ['Compra de Inventario', 'Alquiler', 'Salarios', 'Marketing', 'Suministros', 'Factura de Proveedor', 'Otros Gastos']
};

export function isOverdue(dueDate: string | undefined, status: TransactionStatus | undefined): boolean {
  if (!dueDate || status === 'paid') { // only pending or overdue (if pre-set) can be overdue
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Compare dates only
  
  // Ensure dueDate is also treated as date only for comparison
  const due = new Date(dueDate);
  due.setHours(0,0,0,0);

  return due < today && status === 'pending';
}

// Make jspdf and autotable available globally via window object
declare global {
  interface Window {
    jspdf: any; 
  }
}
