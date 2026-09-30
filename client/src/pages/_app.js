import "@/styles/globals.css";
import "@xyflow/react/dist/style.css";
import AppShell from "@/components/AppShell";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function App({ Component, pageProps }) {
  const isPublic = ["/login", "/register"].includes(Component.authRoute);
  if (isPublic) return <Component {...pageProps} />;
  return <ProtectedRoute><AppShell><Component {...pageProps} /></AppShell></ProtectedRoute>;
}
