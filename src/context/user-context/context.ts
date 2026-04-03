import { createContext } from "react";

export type User = {
  id: string;
  name: string;
  email: string;
  lastSeen?: string;
};

export type UserContextType = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
};

export const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
});