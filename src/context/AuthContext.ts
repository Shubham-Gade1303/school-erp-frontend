import { createContext } from "react";
import type { AuthUser, LoginRequest } from "../types/api";

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  accessDeniedMessage: string | null;
  login: (credentials: LoginRequest) => Promise<AuthUser>;
  logout: () => void;
  clearAccessDenied: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
