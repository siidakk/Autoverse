import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import NavBar from "./NavBar";
import SiteFooter from "./SiteFooter";

// The configurator is an app screen rather than a page, so it runs edge to edge
// with no footer underneath it.
const APP_ROUTES = ["/configure"];

export default function SiteLayout() {
  const { pathname } = useLocation();
  const isAppScreen = APP_ROUTES.includes(pathname);

  return (
    <div className="flex min-h-screen flex-col bg-ink">
      <NavBar />

      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="flex-1"
      >
        <Outlet />
      </motion.main>

      {!isAppScreen && <SiteFooter />}
    </div>
  );
}
