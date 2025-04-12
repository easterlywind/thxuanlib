
import { Book, User, BorrowRecord, Notification } from '@/types';

const API_URL = 'http://localhost:5000/api';

// Generic fetch function with error handling
const fetchData = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'API request failed');
    }
    
    return await response.json() as T;
  } catch (error) {
    console.error(`Error in API call to ${endpoint}:`, error);
    throw error;
  }
};

// Books API
export const booksApi = {
  getAll: () => fetchData<Book[]>('/books'),
  
  getById: (id: string) => fetchData<Book>(`/books/${id}`),
  
  create: (book: Omit<Book, 'id'>) => fetchData<Book>('/books', {
    method: 'POST',
    body: JSON.stringify(book),
  }),
  
  update: (id: string, book: Partial<Book>) => fetchData<Book>(`/books/${id}`, {
    method: 'PUT',
    body: JSON.stringify(book),
  }),
  
  delete: (id: string) => fetchData<{ message: string }>(`/books/${id}`, {
    method: 'DELETE',
  }),
};

// Users API
export const usersApi = {
  getAll: () => fetchData<User[]>('/users'),
  
  getById: (id: string) => fetchData<User>(`/users/${id}`),
  
  blockUser: (id: string, isBlocked: boolean, blockReason?: string) => fetchData<User>(`/users/${id}/block`, {
    method: 'PUT',
    body: JSON.stringify({ isBlocked, blockReason }),
  }),

  changePassword: (id: string, currentPassword: string, newPassword: string) => fetchData<{ message: string }>(
    `/users/${id}/change-password`,
    {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }
  ),
};

// Borrow Records API
export const borrowRecordsApi = {
  getAll: () => fetchData<BorrowRecord[]>('/borrow-records'),
  
  create: (record: Omit<BorrowRecord, 'id'>) => fetchData<BorrowRecord>('/borrow-records', {
    method: 'POST',
    body: JSON.stringify(record),
  }),
  
  returnBook: (id: string, returnDate: string) => fetchData<BorrowRecord>(`/borrow-records/${id}/return`, {
    method: 'PUT',
    body: JSON.stringify({ returnDate }),
  }),
};

// Authentication API (simulated for now)
export const authApi = {
  login: async (username: string, password: string) => {
    try {
      const response = await fetchData<{ success: boolean; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
};
