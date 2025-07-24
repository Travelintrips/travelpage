import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import UserDropdown from "./UserDropdown";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ShoppingCart as CartIcon, Truck, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const Header = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { cartCount } = useShoppingCart();
  const [mounted, setMounted] = useState(false);

  // Ensure we're properly mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true);

    // Check for forced logout
    const forceLogout = sessionStorage.getItem("forceLogout");
    if (forceLogout) {
      console.log("Force logout detected in Header, clearing flag");
      sessionStorage.removeItem("forceLogout");
    }

    // Listen for storage changes (for cross-tab logout)
    const handleStorageChange = (e) => {
      if (e.key === "auth_user" && !e.newValue) {
        // User logged out in another tab
        console.log("[Header] Logout detected in another tab");
        window.location.reload();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Prevent header from disappearing during auth state transitions
  if (!mounted) {
    return null;
  }

  // Show header even during loading to prevent layout shift
  const showAuthenticatedUI = isAuthenticated && !isLoading;

  return (
    <>
      <header className="bg-green-800 text-white py-4">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">
              Travelintrips *
            </Link>
            <div className="flex items-center space-x-2">
              <span>ID EN</span>
              <span>| IDR</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/deals" className="hover:text-green-200">
              Deals
            </Link>
            <Link to="/support" className="hover:text-green-200">
              Support
            </Link>
            <Link to="/partnership" className="hover:text-green-200">
              Partnership
            </Link>
            <Link to="/corporates" className="hover:text-green-200">
              For Corporates
            </Link>
            {/* Transportasi Link */}
            <Link to="/transportasi" className="hover:text-green-200">
              <Button
                variant="ghost"
                className="text-white hover:text-green-200 flex items-center"
              >
                <Truck className="h-4 w-4 mr-2" />
                Transportasi
              </Button>
            </Link>
            {/* Show auth-dependent UI when authenticated */}
            {mounted && showAuthenticatedUI && (
              <Link to="/bookings" className="hover:text-green-200">
                Bookings
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            {/* Shopping Cart Button */}
            <Link to="/cart">
              <Button
                variant="ghost"
                size="icon"
                className="relative text-white hover:bg-green-700"
              >
                <CartIcon className="h-5 w-5" />
                {mounted && cartCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {mounted && showAuthenticatedUI ? (
              <UserDropdown />
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="bg-transparent text-white border-white hover:bg-white hover:text-green-800"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button className="bg-white text-green-800 hover:bg-gray-100">
                  <Link to="/register">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
