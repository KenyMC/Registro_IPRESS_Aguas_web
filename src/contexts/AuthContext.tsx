import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../services/api';

interface AuthContextType {
  user: User | null;
  login: (usuario: string, contrasena: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isLoading: boolean;
  usersList: User[];
  setUsersList: React.Dispatch<React.SetStateAction<User[]>>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRG1HXPR7diMfcx8yKjmJ4zCFp41pWpamWO_6a0pyUDPxgnWmjhwKI5VpIt2Mhi5nLL9zdmko1Fgs0E/pub?gid=1723670363&single=true&output=csv';

const parseCSV = (csvText: string): User[] => {
  const lines = csvText.split('\n');
  const result: User[] = [];
  // Skip header (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    if (parts.length >= 6) {
      result.push({
        usuario: parts[0].trim(),
        contrasena: parts[1].trim(),
        codigoRenipress: parts[2].trim(),
        red: parts[3].trim(),
        rol: parts[4].trim(),
        estado: parts[5].trim()
      });
    }
  }
  return result;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('aguas_auth_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    
    const storedList = localStorage.getItem('aguas_auth_list');
    if (storedList) {
      setUsersList(JSON.parse(storedList));
    }

    refreshUsers().finally(() => {
      setIsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUsers = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(USERS_CSV_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const text = await response.text();
        const parsed = parseCSV(text);
        setUsersList(parsed);
        localStorage.setItem('aguas_auth_list', JSON.stringify(parsed));
        
        // If a user is currently logged in, update their session if role/status changed
        if (user) {
          const updatedUser = parsed.find(u => u.usuario === user.usuario);
          if (updatedUser) {
            if (updatedUser.estado !== 'Activo') {
              logout(); // Force logout if disabled
            } else {
              setUser(updatedUser);
              localStorage.setItem('aguas_auth_user', JSON.stringify(updatedUser));
            }
          }
        }
      }
    } catch (err) {
      console.warn("Could not refresh users list, working with cached data if available.", err);
    }
  };

  const login = async (usuario: string, contrasena: string) => {
    // Attempt to fetch fresh users if online
    if (navigator.onLine) {
      await refreshUsers();
    }
    
    // Retrieve latest from state/localStorage
    const currentListStr = localStorage.getItem('aguas_auth_list');
    const listToSearch = currentListStr ? JSON.parse(currentListStr) as User[] : usersList;

    if (!listToSearch || listToSearch.length === 0) {
      return { success: false, message: 'No hay conexión para validar usuarios por primera vez.' };
    }

    const found = listToSearch.find(u => u.usuario === usuario && u.contrasena === contrasena);
    if (!found) {
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }

    if (found.estado !== 'Activo') {
      return { success: false, message: 'Este usuario se encuentra Inactivo.' };
    }

    setUser(found);
    localStorage.setItem('aguas_auth_user', JSON.stringify(found));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('aguas_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, usersList, setUsersList, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
