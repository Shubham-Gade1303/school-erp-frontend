import { useEffect, useState, type ReactNode } from "react";
import { login as loginRequest } from "../API/authApi";
import type { AuthUser, UserRole } from "../types/api";
import { AuthContext } from "./AuthContext";

function getStoredUser(): AuthUser | null {
  const username = localStorage.getItem("school_erp_username");
  const role = localStorage.getItem("school_erp_role") as UserRole | null;

  if (username && role && ["ADMIN", "PRINCIPAL", "TEACHER"].includes(role)) {
    return { username, role };
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setAccessDeniedMessage(null);
      localStorage.removeItem("school_erp_username");
      localStorage.removeItem("school_erp_role");
    };

    const handleForbidden = () => {
      setAccessDeniedMessage(
        "You do not have permission to perform that action.",
      );
    };

    window.addEventListener("school-erp:unauthorized", handleUnauthorized);
    window.addEventListener("school-erp:forbidden", handleForbidden);
    return () => {
      window.removeEventListener("school-erp:unauthorized", handleUnauthorized);
      window.removeEventListener("school-erp:forbidden", handleForbidden);
    };
  }, []);

  async function login(credentials: Parameters<typeof loginRequest>[0]) {
    const { data } = await loginRequest(credentials);
    const authenticatedUser: AuthUser = {
      username: data.username,
      role: data.role,
    };

    localStorage.setItem("school_erp_token", data.token);
    localStorage.setItem("school_erp_username", data.username);
    localStorage.setItem("school_erp_role", data.role);
    setUser(authenticatedUser);
    setAccessDeniedMessage(null);

    return authenticatedUser;
  }

  function logout() {
    localStorage.removeItem("school_erp_token");
    localStorage.removeItem("school_erp_username");
    localStorage.removeItem("school_erp_role");
    setUser(null);
    setAccessDeniedMessage(null);
  }

  function clearAccessDenied() {
    setAccessDeniedMessage(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        accessDeniedMessage,
        login,
        logout,
        clearAccessDenied,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
