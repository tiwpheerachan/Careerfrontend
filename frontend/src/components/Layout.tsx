import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <ScrollToTop />
      <main className="flex-1 relative isolate overflow-x-hidden pt-0 pb-10 sm:pb-12 lg:pb-16">
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
