import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import UserDropdown from "./UserDropdown";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ShoppingCart as CartIcon, Truck, Bell, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface Notification {
  id: string;
  notification_id: string;
  is_read: boolean;
  created_at: string;
  notification: {
    message: string;
    type: string;
    booking_id?: string;
    code_booking?: string;
    metadata?: any;
  };
}

const Header = () => {
  // Always call all hooks at the top level in the same order
  const { isAuthenticated, isLoading, userRole, userId } = useAuth();
  const { cartCount } = useShoppingCart();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  // Define restricted roles as a constant to avoid dependency issues
  const restrictedRoles = ["Agent", "Driver Perusahaan", "Driver Mitra"];
  const isRestrictedRole = userRole && restrictedRoles.includes(userRole);
  const showAuthenticatedUI = isAuthenticated && !isLoading;

  // Load notifications function
  const loadNotifications = async () => {
  if (!userId || !isAuthenticated) return;

  setNotificationsLoading(true);
  try {
    const { data, error } = await supabase
      .from("notification_recipients") // ✅ fix typo
      .select(
        `
        id,
        notification_id,
        is_read,
        created_at,
        notification:notifications(
          message,
          type,
          booking_id,
          code_booking,
          metadata
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error loading notifications:", error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
  } catch (error) {
    console.error("Error loading notifications:", error);
  } finally {
    setNotificationsLoading(false);
  }
};


  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!userId || !isAuthenticated) return;

    try {
      const { error } = await supabase
        .from("notification_recipients")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking notifications as read:", error);
        return;
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };

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

  // Load notifications when user is authenticated (exclude Customer role)
  useEffect(() => {
    if (isAuthenticated && userId && mounted && userRole !== "Customer") {
      loadNotifications();
    }
  }, [isAuthenticated, userId, mounted, userRole]);

  // Subscribe to realtime notifications (exclude Customer role)
  useEffect(() => {
    if (!isAuthenticated || !userId || !mounted || userRole === "Customer")
      return;

    const channel = supabase
      .channel("notification_recipients")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_recipients",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Notification change received:", payload);
          // Reload notifications when changes occur
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId, mounted, userRole]);

  // Force logout restricted users immediately - always call useEffect with consistent dependencies
  useEffect(() => {
    if (isAuthenticated && userRole && restrictedRoles.includes(userRole)) {
      console.log(
        "[Header] Restricted role detected, forcing logout:",
        userRole,
      );

      // Clear all auth data immediately
      localStorage.removeItem("auth_user");
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("userPhone");
      localStorage.removeItem("userRole");
      localStorage.removeItem("isAdmin");
      sessionStorage.clear();

      // Sign out from Supabase
      supabase.auth
        .signOut({ scope: "global" })
        .then(() => {
          console.log("[Header] Successfully signed out restricted user");
          // Force page reload to clear any remaining state
          window.location.reload();
        })
        .catch((error) => {
          console.error("[Header] Error signing out restricted user:", error);
          // Force page reload anyway
          window.location.reload();
        });
    }
  }, [isAuthenticated, userRole]);

  // Show loading state instead of returning null to prevent hook order issues
  if (!mounted) {
    return (
      <header className="bg-green-800 text-white py-4">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">
              Journey *
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // Debug logging for UI state
  console.log('[Header] Render state:', {
    isAuthenticated,
    isLoading,
    userRole,
    userId,
    showAuthenticatedUI,
    isRestrictedRole
  });

  return (
    <>
      <header className="bg-green-800 text-white py-4">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold">
              Journey *
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
            {showAuthenticatedUI && (
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
                {cartCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Inbox Notifications Button - Only show when authenticated and not Customer */}
            {showAuthenticatedUI && userRole !== "Customer" && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative text-white hover:bg-green-700"
                  >
                    <Mail className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-96">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      Inbox Notifikasi
                      {unreadCount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={markAllAsRead}
                        >
                          Tandai Semua Dibaca
                        </Button>
                      )}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notificationsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                      </div>
                    ) : notifications.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">
                        Tidak ada notifikasi
                      </p>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                            notification.is_read
                              ? "bg-gray-50 border-gray-200"
                              : "bg-blue-50 border-blue-200"
                          }`}
                          onClick={() => {
                            // Mark as read when clicked
                            if (!notification.is_read) {
                              supabase
                                .from("notification_recipients")
                                .update({ is_read: true })
                                .eq("id", notification.id)
                                .then(() => {
                                  setNotifications((prev) =>
                                    prev.map((n) =>
                                      n.id === notification.id
                                        ? { ...n, is_read: true }
                                        : n,
                                    ),
                                  );
                                  setUnreadCount((prev) =>
                                    Math.max(0, prev - 1),
                                  );
                                });
                            }
                            // Navigate to booking details if booking_id exists
                            if (notification.notification?.booking_id) {
                              const bookingId =
                                notification.notification.booking_id;
                              const type = notification.notification.type;

                              // Navigate based on notification type
                              if (type === "booking") {
                                window.open(`/admin/bookings`, "_blank");
                              } else if (type === "airport_transfer") {
                                window.open(
                                  `/admin/airport-transfer`,
                                  "_blank",
                                );
                              } else if (type === "baggage_booking") {
                                window.open(`/admin/baggage-booking`, "_blank");
                              } else if (type === "handling_booking") {
                                window.open(
                                  `/admin/handling-booking`,
                                  "_blank",
                                );
                              }
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {notification.notification?.metadata?.title ||
                                  "Notifikasi"}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {notification.notification?.message}
                              </p>
                              {notification.notification?.code_booking && (
  <p className="text-sm text-gray-800 font-mono mt-1">
    Kode: {notification.notification.code_booking}
  </p>
)}
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(
                                  notification.created_at,
                                ).toLocaleString("id-ID")}
                              </p>
                            </div>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {showAuthenticatedUI ? (
              <UserDropdown />
            ) : (
              !isRestrictedRole && (
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
              )
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
