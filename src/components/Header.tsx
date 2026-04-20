import React, { useEffect, useRef, useState } from "react";
import cstLogo from "@/assets/cstlogo.png";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { useTranslation } from "react-i18next";
import UserDropdown from "./UserDropdown";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ShoppingCart as CartIcon, Truck, Bell, Mail, ChevronDown, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const { isAuthenticated, isLoading, userRole, userId, user, isSessionReady } = useAuth();
  const { cartCount } = useShoppingCart();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [jasaTransferOpen, setJasaTransferOpen] = useState(false);
  const servicesRef = useRef<HTMLDivElement>(null);

  // Define restricted roles as a constant to avoid dependency issues
  const restrictedRoles = ["Agent", "Driver Perusahaan", "Driver Mitra"];
  const isRestrictedRole = userRole && restrictedRoles.includes(userRole);
  
  // SIMPLIFIED: Show authenticated UI when user is authenticated and component is mounted
  const showAuthenticatedUI = mounted && isAuthenticated && !isRestrictedRole;

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

    // Close services dropdown when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
        setJasaTransferOpen(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load notifications when user is authenticated (exclude Customer role)
  useEffect(() => {
    if (showAuthenticatedUI && userId && userRole !== "Customer") {
      loadNotifications();
    }
  }, [showAuthenticatedUI, userId, userRole]);

  // Subscribe to realtime notifications (exclude Customer role)
  useEffect(() => {
    if (!showAuthenticatedUI || !userId || userRole === "Customer")
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
  }, [showAuthenticatedUI, userId, userRole]);

  // Force logout restricted users immediately - always call useEffect with consistent dependencies
  useEffect(() => {
    if (mounted && isAuthenticated && userRole && restrictedRoles.includes(userRole)) {
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
  }, [mounted, isAuthenticated, userRole]);

  // SIMPLIFIED: Show loading only when not mounted or still loading initial session
  if (!mounted || (isLoading && !isSessionReady)) {
    return (
      <header className="bg-green-800 text-white py-4">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold flex items-center">
              <img
                src={cstLogo}
                alt="CST Logistik"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "inline";
                }}
              />
              <span style={{ display: "none" }} className="text-white font-bold text-xl">
                CST Logistik
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <div className="animate-pulse bg-green-700 rounded px-4 py-2 w-20 h-8"></div>
            <div className="animate-pulse bg-green-700 rounded px-4 py-2 w-20 h-8"></div>
          </div>
        </div>
      </header>
    );
  }

  // Debug logging for UI state
  console.log('[Header] Render state:', {
    mounted,
    isAuthenticated,
    isLoading,
    userRole,
    userId,
    user: !!user,
    isSessionReady,
    showAuthenticatedUI,
    isRestrictedRole
  });

  return (
    <>
      <header className="bg-green-800 text-white py-4">
        <div className="container mx-auto flex justify-between items-center px-4">
          <div className="flex items-center space-x-4">
            <Link to="/" className="text-xl font-bold flex items-center">
              <img
                src={cstLogo}
                alt="CST Logistik"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "inline";
                }}
              />
              <span style={{ display: "none" }} className="text-white font-bold text-xl">
                CST Logistik
              </span>
            </Link>
            <div className="flex items-center space-x-2">
              <span>ID EN</span>
              <span>| IDR</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            {/* Services Dropdown */}
            <div
              ref={servicesRef}
              className="relative"
              onMouseEnter={() => setServicesOpen(true)}
              onMouseLeave={() => { setServicesOpen(false); setJasaTransferOpen(false); }}
            >
              <button
                className="flex items-center gap-1 hover:text-green-200 font-medium py-1 px-2 rounded transition-colors"
                onClick={() => { setServicesOpen(!servicesOpen); if (!servicesOpen) setJasaTransferOpen(false); }}
              >
                Services
                <ChevronDown className={`h-4 w-4 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
              </button>

              {servicesOpen && (
                <div className="absolute left-0 top-full mt-1 w-52 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 z-50 py-1">
                  {/* Jasa Transfer with submenu */}
                  <div
                    className="relative group"
                    onMouseEnter={() => setJasaTransferOpen(true)}
                    onMouseLeave={() => setJasaTransferOpen(false)}
                  >
                    <button
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-green-50 hover:text-green-700 transition-colors text-sm font-medium"
                      onClick={() => setJasaTransferOpen(!jasaTransferOpen)}
                    >
                      <span>Jasa Transfer</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>

                    {jasaTransferOpen && (
                      <div className="absolute left-full top-0 ml-1 w-44 bg-white text-gray-800 rounded-lg shadow-xl border border-gray-100 z-50 py-1">
                        <Link
                          to="/transportasi"
                          className="block px-4 py-2.5 hover:bg-green-50 hover:text-green-700 transition-colors text-sm"
                          onClick={() => { setServicesOpen(false); setJasaTransferOpen(false); }}
                        >
                          Domestic
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Export Import */}
                  <Link
                    to="/export&import"
                    className="block px-4 py-2.5 hover:bg-green-50 hover:text-green-700 transition-colors text-sm font-medium"
                    onClick={() => setServicesOpen(false)}
                  >
                    Export Import
                  </Link>
                </div>
              )}
            </div>

            <Link to="/support" className="hover:text-green-200">
              {t('navbar.support')}
            </Link>
            <Link to="/partnership" className="hover:text-green-200">
              {t('navbar.partnership')}
            </Link>
            <Link to="/corporates" className="hover:text-green-200">
              {t('navbar.forCorporates')}
            </Link>
            {/* Transportasi Link */}
            <Link to="/transportasi" className="hover:text-green-200">
              <Button
                variant="ghost"
                className="text-white hover:text-green-200 flex items-center"
              >
                <Truck className="h-4 w-4 mr-2" />
                {t('navbar.transportasi')}
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
                    <DialogDescription>
                      Daftar notifikasi terbaru untuk akun Anda
                    </DialogDescription>
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