import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import NavBar from "./NavBar";
import SiteFooter from "./SiteFooter";

// The configurator is an app screen rather than a page, so it runs edge to edge
// with no footer underneath it.
const APP_ROUTES = ["/customise"];

export default function SiteLayout() {
  const { pathname } = useLocation();
  const isAppScreen = APP_ROUTES.includes(pathname);

  return (
    // An app screen gets exactly the height left over after the header, worked
    // out by the layout rather than by subtracting a number that has to be kept
    // in step with the header's own height and border. Getting that number
    // wrong is how the configurator's footer ended up off the bottom of the
    // screen and drawn over its own content.
    <div
      className={[
        "flex flex-col bg-ink",
        isAppScreen ? "h-svh overflow-hidden" : "min-h-screen"
      ].join(" ")}
    >
      <NavBar />

      {/* Pages rise a little as they arrive. An app screen does not: it is
          already exactly as tall as the space it has, and sliding it down
          eight pixels inside a container that hides its overflow crops the
          bottom of the panel for as long as the animation lasts. */}
      <motion.main
        key={pathname}
        initial={isAppScreen ? { opacity: 0 } : { opacity: 0, y: 8 }}
        animate={isAppScreen ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={isAppScreen ? "min-h-0 flex-1" : "flex-1"}
      >
        <Outlet />
      </motion.main>

      {!isAppScreen && <SiteFooter />}
    </div>
  );
}
