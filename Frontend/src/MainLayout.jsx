import React, { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar/Sidebar";
import Header from "./dashboard/Header";
import api from "./api/axiosInstance";
import { API_ENDPOINTS } from "./api/endpoints";

const MOBILE_LAYOUT_QUERY = "(max-width: 767px)";

function MainLayout() {
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }

    return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
  });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const handleViewportChange = (event) => {
      setIsMobileViewport(event.matches);
      setMobileSidebarOpen(false);
    };

    handleViewportChange(mediaQuery);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const shouldLockScroll = isMobileViewport && mobileSidebarOpen;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = shouldLockScroll ? "hidden" : "";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileViewport, mobileSidebarOpen]);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const token =
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");

        const role =
          (localStorage.getItem("role") ||
            sessionStorage.getItem("role") ||
            "").toLowerCase();

        let roleName =
          localStorage.getItem("roleName") ||
          sessionStorage.getItem("roleName");

        if (!token) {
          localStorage.setItem("permissions", JSON.stringify([]));
          return;
        }

        if (role === "admin") {
          localStorage.setItem(
            "permissions",
            JSON.stringify([{ moduleName: "ALL" }])
          );
          return;
        }

        if (role === "user") {
          localStorage.setItem("permissions", JSON.stringify([]));
          return;
        }

        if (!roleName) {
          localStorage.setItem("permissions", JSON.stringify([]));
          return;
        }

        roleName = roleName.trim();

        const res = await api.get(API_ENDPOINTS.rolePermission.byRoleName(roleName), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data =
          res?.data?.data?.$values ||
          res?.data?.data ||
          res?.data ||
          [];

        if (!Array.isArray(data) || data.length === 0) {
          localStorage.setItem("permissions", JSON.stringify([]));
          return;
        }

        const uniqueModules = [
          ...new Set(
            data
              .filter((permission) => (permission.canAccess ?? permission.CanAccess) === true)
              .map((permission) =>
                (permission.moduleName || permission.ModuleName || "")
                  .replace("User ", "")
                  .trim()
              )
              .filter(Boolean)
          ),
        ];

        localStorage.setItem(
          "permissions",
          JSON.stringify(uniqueModules.map((moduleName) => ({ moduleName })))
        );
      } catch (error) {
        console.error(
          "Permission initialization error:",
          error?.response?.data || error.message
        );
        localStorage.setItem("permissions", JSON.stringify([]));
      } finally {
        setReady(true);
      }
    };

    fetchPermissions();
  }, []);

  const handleSidebarClose = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const handleSidebarToggle = () => {
    if (isMobileViewport) {
      setMobileSidebarOpen((prev) => !prev);
      return;
    }

    setCollapsed((prev) => !prev);
  };

  if (!ready) {
    return <p style={{ padding: "20px" }}>Initializing...</p>;
  }

  return (
    <div
      className={`app-layout ${isMobileViewport ? "is-mobile" : ""} ${mobileSidebarOpen ? "is-mobile-sidebar-open" : ""
        }`}
    >
      <Sidebar
        collapsed={collapsed}
        isMobile={isMobileViewport}
        mobileOpen={mobileSidebarOpen}
        onClose={handleSidebarClose}
      />

      <div
        className={`app-main ${!isMobileViewport && collapsed ? "is-collapsed" : ""}`}
      >
        <Header
          collapsed={collapsed}
          isMobileViewport={isMobileViewport}
          onToggle={handleSidebarToggle}
        />

        <div className="app-main-scroll">
          <main className="page-shell">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
