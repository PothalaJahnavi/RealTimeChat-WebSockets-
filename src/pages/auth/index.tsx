import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/context/user-context/use-user.context";
import { userService } from "@/services/user.service";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const { setUser } = useUser();

  // login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // register state
  const [name, setName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const saveAuth = (res: {
    token: string;
    user: { id: string; name: string; email: string };
  }) => {
    localStorage.setItem("token", res.token);
    localStorage.setItem("userId", res.user.id);
    localStorage.setItem('user',JSON.stringify(res.user))
    setUser(res.user);
  };

  const handleLogin = async () => {
    if (!email) {
      toast.error("Email is required");
      return;
    }
    if (!password) {
      toast.error("Password is required");
      return;
    }

    try {
      const res = await userService.login({ email, password });
      saveAuth(res);
      toast.success("Logged in successfully!");
      navigate("/chat");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error?.response?.data?.message || "Login failed. Please try again.",
        );
      } else {
        toast.error("Login failed. Please try again.");
      }
    }
  };

  const handleRegister = async () => {
    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (!regEmail) {
      toast.error("Email is required");
      return;
    }
    if (!regPassword) {
      toast.error("Password is required");
      return;
    }
    if (regPassword !== confirmPassword) {
      toast.error("Passwords do not match with confirm password");
      return;
    }

    try {
      const res = await userService.register({
        name,
        email: regEmail,
        password: regPassword,
        confirmPassword,
      });
      saveAuth(res);
      toast.success("Account created successfully!");
      navigate("/chat");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error?.response?.data?.message ||
            "Registration failed. Please try again.",
        );
      } else {
        toast.error("Registration failed. Please try again.");
      }
    }
  };

  return (
    <div className="h-[100vh] w-[100vw] flex flex-col justify-center items-center">
      <div className="h-[80vh] bg-white border-2 border-white text-opacity-90 shadow-2xl w-[70vw] md:w-[80vw] lg:w-[60vw] xl:w-[50vw] rounded-3xl grid xl:grid-cols-1">
        <div className="flex flex-col items-center justify-center gap-10">
          <h1 className="text-5xl font-bold text-center">
            Welcome Chat Here!!
          </h1>

          <div className="w-full p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1">
                  Register
                </TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login" className="mt-6 flex flex-col gap-4">
                <Input
                  placeholder="Email"
                  className="rounded-full p-6"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  className="rounded-full p-6"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  onClick={handleLogin}
                  className="bg-black text-white py-3 rounded-full mt-2"
                >
                  Login
                </button>
              </TabsContent>

              {/* REGISTER */}
              <TabsContent
                value="register"
                className="mt-6 flex flex-col gap-4"
              >
                <Input
                  placeholder="Name"
                  className="rounded-full p-6"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  placeholder="Email"
                  className="rounded-full p-6"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  className="rounded-full p-6"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  className="rounded-full p-6"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  onClick={handleRegister}
                  className="bg-black text-white py-3 rounded-full mt-2"
                >
                  Register
                </button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
