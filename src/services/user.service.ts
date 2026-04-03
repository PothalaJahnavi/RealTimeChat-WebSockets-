import api from "./api";

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ContactUser {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

export const userService = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const res = await api.post("/auth/login", data);
    return res.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const res = await api.post("/auth/register", data);
    return res.data;
  },

   getAllUsers: async (): Promise<{ users: ContactUser[] }> => {
    const res = await api.get("/auth/users");
    return res.data;
  },
};