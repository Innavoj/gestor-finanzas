
import React, { createContext, useReducer, useContext, ReactNode, useEffect, useCallback } from 'react';
import { AppState, Action, Product, Transaction, ViewName } from './types';
import { API_BASE_URL } from './constants';

const initialState: AppState = {
  products: [],
  transactions: [],
  activeView: 'dashboard',
  isLoading: true,
  error: null,
};

export type AppContextType = {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  fetchProducts: () => Promise<void>;
  fetchTransactions: () => Promise<void>;
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product | null>;
  addTransaction: (transactionData: Omit<Transaction, 'id' | 'status' | 'paymentDate' | 'createdAt' | 'updatedAt' | 'productName'>) => Promise<Transaction | null>;
  markTransactionAsPaid: (transactionId: string, paymentDate: string) => Promise<boolean>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }; // Clear error when loading
    case 'SET_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, isLoading: false };
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload, isLoading: false };
    case 'SET_VIEW':
      return { ...state, activeView: action.payload };
    
    // These actions are kept for potential optimistic updates or direct state manipulation if needed,
    // but primary data flow for CUD operations is: component -> context function (API call) -> re-fetch -> SET_PRODUCTS/SET_TRANSACTIONS.
    case 'ADD_PRODUCT': // Example if we wanted optimistic update based on this action
      return { ...state, products: [...state.products, action.payload] };
    case 'ADD_TRANSACTION': // Example for optimistic update
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'MARK_TRANSACTION_AS_PAID': // Example for optimistic update
      return {
        ...state,
        transactions: state.transactions.map(t =>
          t.id === action.payload.transactionId
            ? { ...t, status: 'paid', paymentDate: action.payload.paymentDate }
            : t
        ),
      };
    case 'UPDATE_PRODUCT_STOCK': // Backend handles stock changes with transactions. This might be for manual adjustments not yet implemented.
      return {
        ...state,
        products: state.products.map(p =>
          p.id === action.payload.productId ? { ...p, stock: p.stock + action.payload.change } : p
        ),
      };
    default:
      return state;
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const fetchProducts = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${API_BASE_URL}/products`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message);
      }
      const data: Product[] = await response.json();
      dispatch({ type: 'SET_PRODUCTS', payload: data });
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      dispatch({ type: 'SET_ERROR', payload: error.message || "Error al cargar productos." });
      // alert("Error al cargar productos. Verifique la consola para más detalles.");
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message);
      }
      const data: Transaction[] = await response.json();
      dispatch({ type: 'SET_TRANSACTIONS', payload: data });
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error);
      dispatch({ type: 'SET_ERROR', payload: error.message || "Error al cargar transacciones." });
      // alert("Error al cargar transacciones. Verifique la consola para más detalles.");
    }
  }, []);

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product | null> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message);
      }
      const newProduct: Product = await response.json();
      await fetchProducts(); // Re-fetch all products for consistency
      return newProduct;
    } catch (error: any) {
      console.error("Failed to add product:", error);
      dispatch({ type: 'SET_ERROR', payload: error.message || "Error al agregar producto." });
      alert(`Error al agregar producto: ${error.message}`);
      return null;
    } finally {
       dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'status' | 'paymentDate' | 'createdAt' | 'updatedAt' | 'productName'>): Promise<Transaction | null> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${API_BASE_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message);
      }
      const newTransaction: Transaction = await response.json();
      await fetchTransactions(); // Re-fetch transactions
      if (transactionData.productId && transactionData.quantity) {
          await fetchProducts(); // Re-fetch products as stock might have changed
      }
      return newTransaction;
    } catch (error: any) {
      console.error("Failed to add transaction:", error);
      dispatch({ type: 'SET_ERROR', payload: error.message || "Error al agregar transacción." });
      alert(`Error al agregar transacción: ${error.message}`);
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const markTransactionAsPaid = async (transactionId: string, paymentDate: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/${transactionId}/mark-as-paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentDate }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message);
      }
      await fetchTransactions(); // Re-fetch transactions
      return true;
    } catch (error: any) {
      console.error("Failed to mark transaction as paid:", error);
      dispatch({ type: 'SET_ERROR', payload: error.message || "Error al marcar como pagada." });
      alert(`Error al marcar como pagada: ${error.message}`);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
        dispatch({ type: 'SET_LOADING', payload: true });
        // Fetch products first, then transactions. isLoading will be managed by these individual fetches.
        // SET_ERROR in any fetch will also set isLoading to false.
        // SET_PRODUCTS or SET_TRANSACTIONS will set isLoading to false.
        await fetchProducts(); 
        await fetchTransactions();
    };
    loadInitialData();
  }, [fetchProducts, fetchTransactions]);

  return React.createElement(AppContext.Provider, { value: { state, dispatch, fetchProducts, fetchTransactions, addProduct, addTransaction, markTransactionAsPaid } }, children);
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
