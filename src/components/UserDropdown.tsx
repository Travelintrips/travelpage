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

  // CRITICAL: Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Show loading only when actually loading
  if (isLoading) {
    return (
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-white opacity-70"
      >
        <div className="animate-pulse w-16 h-4 bg-white/20 rounded"></div>
      </Button>
    );
  }

  // FIXED: Only use AuthContext data, never read from localStorage
  const userName = React.useMemo(() => {
    // Only use AuthContext data - never read localStorage during render
    if (
      authUserName &&
      authUserName.trim() !== "" &&
      !["Customer", "User"].includes(authUserName)
    ) {
      return authUserName;
    }

    // Use email username if available
    if (userEmail) {
      return userEmail.split("@")[0];
    }

    // Fallback
    return "User";
  }, [authUserName, userEmail]);

  // FIXED: Only use AuthContext role, never read localStorage
  const effectiveRole = role || "Customer";
  const effectiveIsAdmin = isAdmin || effectiveRole === "Admin";
  const displayRole = effectiveIsAdmin ? "Admin" : effectiveRole;

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  // FIXED: Enhanced logout function with proper error handling
  const handleLogout = async () => {
    console.log("[UserDropdown] Starting complete logout process...");

    try {
      // Disable the button to prevent multiple clicks
      const button = document.activeElement as HTMLButtonElement;
      if (button) {
        button.disabled = true;
      }

      // Use AuthContext signOut which handles everything including reload
      await signOut();
      
      console.log("[UserDropdown] Logout completed successfully");
    } catch (error) {
      console.error("[UserDropdown] Logout error:", error);
      
      // Force cleanup and reload even if signOut fails
      localStorage.clear();
      sessionStorage.clear();
      sessionStorage.setItem("loggedOut", "true");
      localStorage.setItem("userLoggedOut", "true");
      
      // Force reload to ensure clean state
      setTimeout(() => {
        window.location.href = window.location.origin;
      }, 100);
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