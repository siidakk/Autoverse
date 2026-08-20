import { createContext, useContext } from "react";

// The context lives apart from the provider so that a file can hold either
// components or plain functions, not both, which is what fast refresh needs to
// know which of them to reload.
export const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth needs to be inside AuthProvider");
  return context;
}
