import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Catalogue from "./pages/Catalogue.jsx";
import BookDetails from "./pages/BookDetails.jsx";
import Plans from "./pages/Plans.jsx";
import Account from "./pages/Account.jsx";
import Reader from "./pages/Reader.jsx";
import Admin from "./pages/Admin.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/books" element={<Catalogue />} />
        <Route path="/books/:id" element={<BookDetails />} />
        <Route path="/plans" element={<Plans />} />

        {/* Members only */}
        <Route element={<ProtectedRoute />}>
          <Route path="/account" element={<Account />} />
          <Route path="/books/:id/read/:chapter" element={<Reader />} />

          {/* Admins only (nested, so the login check runs first) */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}