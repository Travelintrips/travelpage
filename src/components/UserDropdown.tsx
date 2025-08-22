import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  User,
  BookOpen,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Create global BroadcastChannel for cross-tab logout synchronization
const authChannel = new BroadcastChannel("auth");

const UserDropdown = () => {
  const {
    userRole: role,
    signOut,
    isAdmin,
    isLoading,
    userEmail,
    userName: authUserName,
    isAuthenticated,
  } = useAuth();

  const navigate = useNavigate();

  // Show loading only for a brief moment with timeout - reduced to minimize flickering
  const [showLoading, setShowLoading] = React.useState(true);
  const [isStable, setIsStable] = React.useState(false);

  // Consistent userName resolution - prioritize AuthContext over localStorage
  const userName = React.useMemo(() => {
    // First priority: AuthContext userName (most up-to-date)
    if (
      authUserName &&
      authUserName.trim() !== "" &&
      !["Customer", "User"].includes(authUserName)
    ) {
      return authUserName;
    }

    // Second priority: localStorage userName
    const storedUserName = localStorage.getItem("userName");
    if (
      storedUserName &&
      storedUserName.trim() !== "" &&
      !["Customer", "User"].includes(storedUserName)
    ) {
      return storedUserName;
    }

    // Third priority: email username
    if (userEmail) {
      return userEmail.split("@")[0];
    }

    // Fallback
    return "User";
  }, [authUserName, userEmail]);

  React.useEffect(() => {
    if (isLoading) {
      // Reduced timeout to minimize flickering
      const timeout = setTimeout(() => {
        setShowLoading(false);
        setIsStable(true);
      }, 1000);

      return () => clearTimeout(timeout);
    } else {
      setShowLoading(false);
      // Add small delay for stability
      setTimeout(() => setIsStable(true), 200);
    }
  }, [isLoading]);

  // Don't render if not authenticated and not loading
  if (!isAuthenticated && !isLoading && !showLoading) {
    return null;
  }

  // Show loading state - only if not stable to prevent flickering
  if (isLoading && showLoading && !isStable) {
    return (
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-white opacity-70"
      >
        <div className="animate-pulse w-16 h-4 bg-white/20 rounded"></div>
      </Button>
    );
  }

  // If not authenticated after loading is complete, don't render
  if (!isAuthenticated) {
    return null;
  }

  // Get role from multiple sources with priority
  const storedRole = localStorage.getItem("userRole");
  const authUserStr = localStorage.getItem("auth_user");
  let authUserRole = null;

  try {
    if (authUserStr) {
      const authUser = JSON.parse(authUserStr);
      authUserRole = authUser.role;
    }
  } catch (e) {
    console.warn("Error parsing auth_user from localStorage:", e);
  }

  // Handle role object from database join (role.role_name) or direct string
  let resolvedRole = role;
  if (role && typeof role === 'object' && role.role_name) {
    resolvedRole = role.role_name;
  }

  // Priority: AuthContext role > localStorage auth_user role > localStorage userRole > fallback
  const effectiveRole = resolvedRole || authUserRole || storedRole || "Customer";

  // Simplified admin check
  const effectiveIsAdmin =
    isAdmin ||
    localStorage.getItem("isAdmin") === "true" ||
    effectiveRole === "Admin";
  const displayRole = effectiveIsAdmin ? "Admin" : effectiveRole;

  console.log("[UserDropdown] Role resolution:", {
    contextRole: role,
    authUserRole,
    storedRole,
    effectiveRole,
    displayRole,
  });

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const clearAuthStorage = () => {
    // Clear all localStorage items
    localStorage.removeItem("auth_user");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("userName");
    localStorage.removeItem("shopping_cart");
    localStorage.removeItem("booking_data");
    localStorage.removeItem("recent_bookings");
    localStorage.removeItem("selected_vehicle");
    localStorage.removeItem("payment_data");
    localStorage.removeItem("airport_transfer_data");
    localStorage.removeItem("baggage_data");
    localStorage.removeItem("driverData");

    // Clear Supabase auth tokens
    localStorage.removeItem("supabase.auth.token");
    localStorage.removeItem("sb-refresh-token");
    localStorage.removeItem("sb-access-token");
    localStorage.removeItem("sb-auth-token");
    localStorage.removeItem("supabase.auth.data");
    localStorage.removeItem("supabase.auth.expires_at");
    localStorage.removeItem("supabase.auth.expires_in");
    localStorage.removeItem("supabase.auth.refresh_token");
    localStorage.removeItem("supabase.auth.access_token");
    localStorage.removeItem("supabase.auth.provider_token");
    localStorage.removeItem("supabase.auth.provider_refresh_token");

    // Clear session storage
    try {
      sessionStorage.clear();
    } catch (e) {
      console.warn("[UserDropdown] Error clearing session storage:", e);
    }

    // Set logout flags
    sessionStorage.setItem("forceLogout", "true");
    sessionStorage.setItem("loggedOut", "true");
  };

  const handleLogout = async () => {
    console.log("[Logout] Starting logout process...");

    // Buat Promise race: paksa lanjut jika signOut terlalu lama
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2000)); // 2 detik

    try {
      await Promise.race([supabase.auth.signOut(), timeout]);
    } catch (err) {
      console.warn("[Logout] Supabase signOut failed:", err);
    } finally {
      console.log("[Logout] Forcing cleanup...");

      // Sinkronisasi antar tab
      localStorage.setItem("logout", Date.now().toString());

      // Bersihkan state dan storage
      localStorage.clear();
      sessionStorage.clear();

      // Paksa redirect
      window.location.href = "/";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-white hover:bg-transparent hover:text-white"
        >
          <span>
            {userName} ({displayRole})
          </span>

          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleNavigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>My Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigate("/bookings")}>
          <BookOpen className="mr-2 h-4 w-4" />
          <span>My Bookings</span>
        </DropdownMenuItem>
        {effectiveIsAdmin && (
          <DropdownMenuItem onClick={() => handleNavigate("/admin")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>Dashboard Admin</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserDropdown;
