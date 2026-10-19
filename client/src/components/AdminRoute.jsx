import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../context/useAuth.js";


export default function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}