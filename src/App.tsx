import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import Auth from "./pages/auth";
import ChatPage from "./pages/chat";
import { Toaster } from "sonner";
import { UserProvider } from "./context/user-context";
import { SocketProvider } from "./context/socket-context";
import ProtectedRoute from "./ProtectedRoute";

const App = () => {
  return (
    <UserProvider>
      <SocketProvider>
        <BrowserRouter>
          <Toaster richColors position="top-right" />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </UserProvider>
  );
};

export default App;
