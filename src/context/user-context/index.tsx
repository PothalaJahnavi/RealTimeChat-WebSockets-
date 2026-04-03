import { useState, type ReactNode } from "react";
import { UserContext, type User } from "./context";
import { useSocket } from "../socket-context/use-socket";

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { socket } = useSocket();
  const [user, setUser] = useState<User | null>(() => {
    // Lazy initializer runs once on mount — no useEffect needed
    const stored = localStorage.getItem("user");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  const logout = () => {
  if (socket) {
    socket.disconnect();
  }

  localStorage.clear();
  setUser(null);
};

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
};
