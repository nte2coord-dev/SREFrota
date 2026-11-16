import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import PublicPortal from "@/pages/PublicPortal";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import DriverGuidePage from "@/pages/DriverGuide";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<PublicPortal />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/guia/:tripId" element={<DriverGuidePage />} />
        <Route path="*" element={<PublicPortal />} />
      </Routes>
      <Toaster richColors />
    </>
  );
}
