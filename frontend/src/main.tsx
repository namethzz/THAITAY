import { createRoot } from "react-dom/client";
import App from "./App";
import { AuthProvider } from "@/context/AuthContext";
import "./styles.css";
import "./styles/auth.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");
createRoot(root).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
);
