import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/services/apiService';

export type UserRole = 'librarian' | 'student';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Auth context now uses the real authentication API

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  
  useEffect(() => {
    // Check if user is already logged in
    const storedUser = localStorage.getItem('libUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user data:', e);
        localStorage.removeItem('libUser');
      }
    }
  }, []);
  
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Use real authentication API
      const response = await authApi.login(username, password);
      
      if (response.success && response.user) {
        // Make sure user object has all required fields
        const user: User = {
          id: response.user.id,
          username: response.user.username,
          fullName: response.user.fullName || response.user.username,
          role: response.user.role as UserRole
        };
        
        setUser(user);
        localStorage.setItem('libUser', JSON.stringify(user));
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      // Pass the error up to the login component
      throw error;
    }
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('libUser');
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
