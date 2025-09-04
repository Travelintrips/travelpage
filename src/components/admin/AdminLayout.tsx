import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Luggage } from "lucide-react";
import {
  Users,
  Car,
  CalendarDays,
  DollarSign,
  BarChart3,
  Activity,
  User,
  UserCog,
  CreditCard,
  ClipboardCheck,
  AlertTriangle,
  Menu,
  X,
  ArrowLeft,
  CheckSquare,
  Package,
  Plane,
  Key,
  Tag,
  Wallet,
  ChevronDown,
  ChevronRight,
  Mail,
  Bell,
  CheckCircle,
  AlertTriangle as AlertTriangleIcon,
  XCircle,
  Info,
  Eye,
  X as CloseIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [carsDriverOpen, setCarsDriverOpen] = React.useState(false);
  const [baggageServiceOpen, setBaggageServiceOpen] = React.useState(false);
  const [handlingServiceOpen, setHandlingServiceOpen] = React.useState(false);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = React.useState(false);
  const [agentManagementOpen, setAgentManagementOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole, userId, isAuthenticated, userName } = useAuth();

  // Get dashboard title based on user role
  const getDashboardTitle = () => {
    switch (userRole) {
      case "Staff Trips":
        return "Staff Trips Dashboard";
      case "Staff Traffic":
        return "Staff Traffic Dashboard";
      case "Admin":
        return "Admin Dashboard";
      case "Super Admin":
        return "Super Admin Dashboard";
      case "Staff":
        return "Staff Dashboard";
      default:
        return "Dashboard";
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
     // console.error("Error signing out:", error);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Load notifications function
  const loadNotifications = async () => {
    if (!userId || !isAuthenticated || userRole === "Customer") return;

    setNotificationsLoading(true);
    try {
    {/*  console.log("[AdminLayout] Loading notifications for user:", userId, "with role:", userRole);*/}
      const { data, error } = await supabase
        .from("notification_recipients")
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
     {/*   console.error("[AdminLayout] Error loading notifications:", error);*/}
        return;
      }

      console.log("[AdminLayout] Loaded notifications:", data?.length || 0, "notifications");
      setNotifications(data || []);
      setUnreadCount(data?.filter((n) => !n.is_read).length || 0);
    } catch (error) {
   {/*   console.error("Error loading notifications:", error);*/}
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!userId || !isAuthenticated || userRole === "Customer") return;

    try {
      const { error } = await supabase
        .from("notification_recipients")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) {
      {/*  console.error("Error marking notifications as read:", error);*/}
        return;
      }

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
    {/*  console.error("Error marking notifications as read:", error);*/}
    }
  };

  // Load notifications when user is authenticated (exclude Customer role)
  React.useEffect(() => {
  /*  console.log("[AdminLayout] Notification loading check:", { 
      isAuthenticated, 
      userId, 
      userRole, 
      shouldLoad: isAuthenticated && userId && userRole !== "Customer" 
    });*/
    
    if (isAuthenticated && userId && userRole !== "Customer") {
    //  console.log("[AdminLayout] Loading notifications for user:", { userId, userRole, isAuthenticated });
      loadNotifications();
    } else {
     /* console.log("[AdminLayout] Skipping notification load:", {
        reason: !isAuthenticated ? "not authenticated" : 
                !userId ? "no userId" : 
                userRole === "Customer" ? "customer role" : "unknown"
      });*/
    }
  }, [isAuthenticated, userId, userRole]);

  // Subscribe to realtime notifications (exclude Customer role)
  React.useEffect(() => {
    if (!isAuthenticated || !userId || userRole === "Customer") {
      console.log("[AdminLayout] Skipping realtime notifications:", { isAuthenticated, userId, userRole });
      return;
    }
    
   // console.log("[AdminLayout] Setting up realtime notifications for:", { userId, userRole });

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
        //  console.log("Notification change received:", payload);
          // Reload notifications when changes occur
          loadNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId, userRole]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-gradient-to-b from-primary-tosca to-primary-dark backdrop-blur-sm border-r border-white/10 transition-all duration-300 h-screen overflow-y-auto fixed left-0 top-0 z-10 shadow-lg`}
      >
        <div className="p-5 border-b border-white/20 flex items-center justify-between bg-gradient-to-r from-primary-dark to-primary-tosca">
          <div
            className={`flex flex-col ${!sidebarOpen && "justify-center w-full"}`}
          >
            <div className="flex items-center">
              <Car className="h-6 w-6 text-white" />
              {sidebarOpen && (
                <span className="ml-2 font-bold text-lg tracking-tight text-white">
                  Admin Panel
                </span>
              )}
            </div>
            {sidebarOpen && userName && (
              <div className="mt-1 ml-8">
                <span className="text-sm text-white/80">
                  {userName}
                </span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={!sidebarOpen ? "hidden" : ""}
          >
            {sidebarOpen ? (
              <X className="h-4 w-4 text-white" />
            ) : (
              <Menu className="h-4 w-4 text-white" />
            )}
          </Button>
        </div>

        {/* Sidebar Menu */}
        <div className="p-4 mt-2">
          <nav className="space-y-2">
            {/* Only show these menu items for non-Staff Trips users */}
            {userRole !== "Staff Trips" && (
              <>
                {/* 1. Dashboard */}
                <Link
                  to="/admin"
                  className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname === "/admin" || location.pathname === "/admin/" ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen && "justify-center"}`}
                >
                  <BarChart3 className="h-5 w-5 text-white" />
                  {sidebarOpen && <span className="ml-3">Dashboard</span>}
                </Link>

                {/* 2. Customers - Hide for Staff Traffic */}
                {userRole !== "Staff Traffic" && (
                  <Link
                    to="/admin/customers"
                    className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/customers") ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen && "justify-center"}`}
                  >
                    <User className="h-5 w-5 text-white" />
                    {sidebarOpen && <span className="ml-3">Customers</span>}
                  </Link>
                )}

                {/* 3. Staff Admin - Hide for Staff Traffic */}
                {userRole !== "Staff Traffic" && (
                  <Link
                    to="/admin/staff"
                    className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/staff") ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen && "justify-center"}`}
                  >
                    <Users className="h-5 w-5 text-white" />
                    {sidebarOpen && <span className="ml-3">Staff Admin</span>}
                  </Link>
                )}

                {/* Dispatcher Menu - Show for all roles except Staff Trips and Staff Traffic */}
                {userRole !== "Staff Trips" && userRole !== "Staff Traffic" && (
                  <Link
                    to="/admin/dispatcher"
                    className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/dispatcher") ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen && "justify-center"}`}
                  >
                    <Users className="h-5 w-5 text-white" />
                    {sidebarOpen && <span className="ml-3">Dispatcher</span>}
                  </Link>
                )}

                {/* Agent Management Menu - Hide for Staff Traffic */}
                {userRole !== "Staff Traffic" && (
                  <div>
                    <button
                      onClick={() =>
                        setAgentManagementOpen(!agentManagementOpen)
                      }
                      className={`w-full flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${
                        location.pathname.includes("/admin/data-agent") ||
                        location.pathname.includes("/admin/booking-agent") ||
                        location.pathname.includes("/admin/top-up-agent") ||
                        location.pathname.includes("/admin/history-top-up") ||
                        location.pathname.includes("/admin/top-up-requests")
                          ? "bg-white/20 font-medium text-white"
                          : "text-white/80"
                      } ${!sidebarOpen && "justify-center"}`}
                    >
                      <UserCog className="h-5 w-5 text-white" />
                      {sidebarOpen && (
                        <>
                          <span className="ml-3 flex-1 text-left">
                            Agent Management
                          </span>
                          {agentManagementOpen ? (
                            <ChevronDown className="h-4 w-4 text-white" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white" />
                          )}
                        </>
                      )}
                    </button>

                    {/* Sub-menu items */}
                    {sidebarOpen && agentManagementOpen && (
                      <div className="ml-6 mt-2 space-y-1">
                        <Link
                          to="/admin/data-agent"
                          className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/data-agent") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                        >
                          <User className="h-4 w-4 text-white" />
                          <span className="ml-3">Data Agent</span>
                        </Link>
                        <Link
                          to="/admin/booking-agent"
                          className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/booking-agent") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                        >
                          <CalendarDays className="h-4 w-4 text-white" />
                          <span className="ml-3">Booking Agent</span>
                        </Link>
                        {/* Hide Top Up Agent for Staff role */}
                        {userRole !== "Staff" && (
                          <Link
                            to="/admin/top-up-agent"
                            className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/top-up-agent") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                          >
                            <Wallet className="h-4 w-4 text-white" />
                            <span className="ml-3">Top Up Agent</span>
                          </Link>
                        )}
                        <Link
                          to="/admin/history-top-up"
                          className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/history-top-up") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                        >
                          <Activity className="h-4 w-4 text-white" />
                          <span className="ml-3">History Top Up</span>
                        </Link>
                        {/* Hide Topup Agent Requests for Staff role */}
                        {userRole !== "Staff" && (
                          <Link
                            to="/admin/top-up-requests"
                            className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/top-up-requests") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                          >
                            <CheckSquare className="h-4 w-4 text-white" />
                            <span className="ml-3">Topup Agent Requests</span>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Bookings Menu - Show for Staff Traffic */}
                <div>
                  <Link
                    to="/admin/bookings"
                    className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname === "/admin/bookings" ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen && "justify-center"}`}
                  >
                    <CalendarDays className="h-5 w-5 text-white" />
                    {sidebarOpen && <span className="ml-3">Bookings</span>}
                  </Link>

                  {/* Bookings Sub-menu items */}
                  {sidebarOpen && (
                    <div className="ml-6 mt-2 space-y-1">
                      <Link
                        to="/admin/bookings/customer"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/bookings/customer") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <User className="h-4 w-4 text-white" />
                        <span className="ml-3">Bookings Customer</span>
                      </Link>
                      <Link
                        to="/admin/bookings/driver"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/bookings/driver") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <UserCog className="h-4 w-4 text-white" />
                        <span className="ml-3">Bookings Driver</span>
                      </Link>
                    </div>
                  )}
                </div>

                {/* 5. Payments - Hide for Staff Traffic */}
                {userRole !== "Staff Traffic" && userRole !== "Staff" && (
                  <Link
                    to="/admin/payments"
                    className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/payments") ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen && "justify-center"}`}
                  >
                    <CreditCard className="h-5 w-5 text-white" />
                    {sidebarOpen && <span className="ml-3">Payments</span>}
                  </Link>
                )}

                {/* Payment Methods Menu - Hide for Staff Traffic */}
                {userRole !== "Staff Trips" && userRole !== "Staff Traffic" && userRole !== "Staff" && (
                  <div>
                    <button
                      onClick={() => setPaymentMethodsOpen(!paymentMethodsOpen)}
                      className={`w-full flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${
                        location.pathname.includes("/admin/payment-methods") ||
                        location.pathname.includes("/admin/paylabs-settings")
                          ? "bg-white/20 font-medium text-white"
                          : "text-white/80"
                      } ${!sidebarOpen && "justify-center"}`}
                    >
                      <Wallet className="h-5 w-5 text-white" />
                      {sidebarOpen && (
                        <>
                          <span className="ml-3 flex-1 text-left">
                            Payment Methods
                          </span>
                          {paymentMethodsOpen ? (
                            <ChevronDown className="h-4 w-4 text-white" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-white" />
                          )}
                        </>
                      )}
                    </button>

                    {/* Sub-menu items */}
                    {sidebarOpen && paymentMethodsOpen && (
                      <div className="ml-6 mt-2 space-y-1">
                        <Link
                          to="/admin/payment-methods"
                          className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/payment-methods") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                        >
                          <Wallet className="h-4 w-4 text-white" />
                          <span className="ml-3">Bank Transfer</span>
                        </Link>
                        <Link
                          to="/admin/paylabs-settings"
                          className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/paylabs-settings") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                        >
                          <CreditCard className="h-4 w-4 text-white" />
                          <span className="ml-3">Paylabs Settings</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}



                {/* 6. Cars & Driver Menu - Show for Staff Traffic */}
                <div>
                  <button
                    onClick={() => setCarsDriverOpen(!carsDriverOpen)}
                    className={`w-full flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${
                      location.pathname.includes("/admin/topup-driver") ||
                      location.pathname.includes("/admin/cars") ||
                      location.pathname.includes("/admin/drivers") ||
                      location.pathname.includes("/admin/inspections") ||
                      location.pathname.includes("/admin/damages") ||
                      location.pathname.includes("/admin/vehicle-inventory") ||
                      location.pathname.includes("/admin/price-km") ||
                      location.pathname.includes("/admin/checklist")
                        ? "bg-white/20 font-medium text-white"
                        : "text-white/80"
                    } ${!sidebarOpen && "justify-center"}`}
                  >
                    <Car className="h-5 w-5 text-white" />
                    {sidebarOpen && (
                      <>
                        <span className="ml-3 flex-1 text-left">
                          Cars & Driver
                        </span>
                        {carsDriverOpen ? (
                          <ChevronDown className="h-4 w-4 text-white" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-white" />
                        )}
                      </>
                    )}
                  </button>

                  {/* Sub-menu items - Show for Staff Traffic */}
                  {sidebarOpen && carsDriverOpen && (
                    <div className="ml-6 mt-2 space-y-1">
                      {/* Topup Driver submenu - Show for all roles except restricted ones */}
                      {userRole !== "Staff" && (
                      <Link
                        to="/admin/topup-driver"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/topup-driver") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <Wallet className="h-4 w-4 text-white" />
                        <span className="ml-3">Topup Driver</span>
                      </Link>
                      )}
                      <Link
                        to="/admin/cars"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/cars") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <Car className="h-4 w-4 text-white" />
                        <span className="ml-3">Cars</span>
                      </Link>
                      <Link
                        to="/admin/drivers"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/drivers") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <UserCog className="h-4 w-4 text-white" />
                        <span className="ml-3">Drivers</span>
                      </Link>
                      <Link
                        to="/admin/inspections"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/inspections") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <ClipboardCheck className="h-4 w-4 text-white" />
                        <span className="ml-3">Inspection</span>
                      </Link>
                      <Link
                        to="/admin/damages"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/damages") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <AlertTriangle className="h-4 w-4 text-white" />
                        <span className="ml-3">Damage</span>
                      </Link>
                      <Link
                        to="/admin/vehicle-inventory"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/vehicle-inventory") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <Package className="h-4 w-4 text-white" />
                        <span className="ml-3">Vehicle Inventory</span>
                      </Link>
                      <Link
                        to="/admin/price-km"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/price-km") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <Tag className="h-4 w-4 text-white" />
                        <span className="ml-3">Price KM</span>
                      </Link>
                      <Link
                        to="/admin/checklist"
                        className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/checklist") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                      >
                        <CheckSquare className="h-4 w-4 text-white" />
                        <span className="ml-3">Checklist Items</span>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Airport Transfer - Hide for Staff Traffic */}
            {userRole !== "Staff Traffic" && (
              <Link
                to="/admin/airport-transfer"
                className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/airport-transfer") ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen && "justify-center"}`}
              >
                <Plane className="h-5 w-5 text-white" />
                {sidebarOpen && <span className="ml-3">Airport Transfer</span>}
              </Link>
            )}

            {/* 9. Baggage Service Menu - Hide for Staff Traffic */}
            {userRole !== "Staff Traffic" && (
              <div>
                <button
                  onClick={() => setBaggageServiceOpen(!baggageServiceOpen)}
                  className={`w-full flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${
                    location.pathname.includes("/admin/baggage-booking") ||
                    location.pathname.includes("/admin/price-baggage")
                      ? "bg-white/20 font-medium text-white"
                      : "text-white/80"
                  } ${!sidebarOpen && "justify-center"}`}
                >
                  <Luggage className="h-5 w-5 text-white" />
                  {sidebarOpen && (
                    <>
                      <span className="ml-3 flex-1 text-left">
                        Baggage Service
                      </span>
                      {baggageServiceOpen ? (
                        <ChevronDown className="h-4 w-4 text-white" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-white" />
                      )}
                    </>
                  )}
                </button>

                {/* Sub-menu items */}
                {sidebarOpen && baggageServiceOpen && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link
                      to="/admin/baggage-booking"
                      className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/baggage-booking") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                    >
                      <Luggage className="h-4 w-4 text-white" />
                      <span className="ml-3">Baggage Booking</span>
                    </Link>
                    <Link
                      to="/admin/price-baggage"
                      className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/price-baggage") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                    >
                      <Tag className="h-4 w-4 text-white" />
                      <span className="ml-3">Price Baggage</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* 10. Handling Service Menu - Hide for Staff Traffic */}
            {userRole !== "Staff Traffic" && (
              <div>
                <button
                  onClick={() => setHandlingServiceOpen(!handlingServiceOpen)}
                  className={`w-full flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${
                    location.pathname.includes("/admin/handling-booking") ||
                    location.pathname.includes("/admin/handling-services")
                      ? "bg-white/20 font-medium text-white"
                      : "text-white/80"
                  } ${!sidebarOpen && "justify-center"}`}
                >
                  <Users className="h-5 w-5 text-white" />
                  {sidebarOpen && (
                    <>
                      <span className="ml-3 flex-1 text-left">
                        Handling Service
                      </span>
                      {handlingServiceOpen ? (
                        <ChevronDown className="h-4 w-4 text-white" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-white" />
                      )}
                    </>
                  )}
                </button>

                {/* Sub-menu items */}
                {sidebarOpen && handlingServiceOpen && (
                  <div className="ml-6 mt-2 space-y-1">
                    <Link
                      to="/admin/handling-booking"
                      className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/handling-booking") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                    >
                      <CalendarDays className="h-4 w-4 text-white" />
                      <span className="ml-3">Handling Booking</span>
                    </Link>
                    <Link
                      to="/admin/handling-services"
                      className={`flex items-center p-2 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/handling-services") ? "bg-white/20 font-medium text-white" : "text-white/70"}`}
                    >
                      <Tag className="h-4 w-4 text-white" />
                      <span className="ml-3">Handling Services</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Only show API Settings for non-Staff Trips and non-Staff Traffic users */}
            {userRole !== "Staff Trips" && userRole !== "Staff Traffic" && userRole !== "Staff" &&  (
              <Link
                to="/admin/api-settings"
                className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/api-settings") ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen ? "justify-center" : ""}`}
              >
                <Key className="h-5 w-5 text-white" />
                {sidebarOpen && <span className="ml-3">API Settings</span>}
              </Link>
            )}
          </nav>

          {/* Sign Out Button */}
          <div className="mt-8 border-t border-white/20 pt-4">
            <button
              onClick={handleSignOut}
              className={`w-full flex items-center p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200 text-white ${!sidebarOpen && "justify-center"}`}
            >
              <X className="h-5 w-5 text-white" />
              {sidebarOpen && <span className="ml-3">Sign Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 ${sidebarOpen ? "ml-64" : "ml-20"} transition-all duration-300`}
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary-tosca to-primary-dark bg-clip-text text-transparent">
                {getDashboardTitle()}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSidebar}
                className="md:hidden"
              >
                <Menu className="h-4 w-4 mr-2" />
                Menu
              </Button>

              {/* Inbox Notifications Button - Only show when authenticated and not Customer */}
              {isAuthenticated && userRole !== "Customer" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="relative flex items-center gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Inbox Notifikasi
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
                  <DialogContent className="max-w-2xl max-h-[80vh] w-full">
                    <DialogHeader>
                      <DialogTitle className="flex items-center justify-between text-lg font-bold">
                        <div className="flex items-center gap-2">
                          <Bell className="h-5 w-5 text-primary" />
                          Inbox Notifikasi
                        </div>
                        {unreadCount > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-xs"
                          >
                            Tandai Semua Dibaca
                          </Button>
                        )}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                      {notificationsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="text-center py-8">
                          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-500 text-sm">
                            Tidak ada notifikasi
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {notifications.map((notification, index) => {
                            // Get notification type icon and color
                            const getNotificationIcon = (type: string) => {
                              switch (type) {
                                case "booking":
                                case "airport_transfer":
                                case "baggage_booking":
                                case "handling_booking":
                                  return { icon: CheckCircle, color: "text-green-500" };
                                case "warning":
                                  return { icon: AlertTriangleIcon, color: "text-yellow-500" };
                                case "error":
                                  return { icon: XCircle, color: "text-red-500" };
                                default:
                                  return { icon: Info, color: "text-blue-500" };
                              }
                            };

                            const { icon: IconComponent, color } = getNotificationIcon(
                              notification.notification?.type || "info"
                            );

                            const handleNotificationClick = () => {
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
                                const type = notification.notification.type;

                                // Navigate based on notification type
                                if (type === "booking") {
                                  navigate("/admin/bookings");
                                } else if (type === "airport_transfer") {
                                  navigate("/admin/airport-transfer");
                                } else if (type === "baggage_booking") {
                                  navigate("/admin/baggage-booking");
                                } else if (type === "handling_booking") {
                                  navigate("/admin/handling-booking");
                                }
                              }
                            };

                            const formatDate = (dateString: string) => {
                              const date = new Date(dateString);
                              return date.toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZoneName: "short"
                              });
                            };

                            return (
                              <div key={notification.id}>
                                <Card
                                  className={`transition-all duration-200 hover:shadow-md cursor-pointer border ${
                                    notification.is_read
                                      ? "bg-white border-gray-200"
                                      : "bg-gray-50 border-gray-300 shadow-sm"
                                  }`}
                                  onClick={handleNotificationClick}
                                >
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <IconComponent className={`h-5 w-5 ${color} flex-shrink-0 mt-0.5`} />
                                        <div className="flex-1 min-w-0">
                                          <CardTitle className="text-base font-semibold text-gray-900 leading-tight mb-1">
                                            {notification.notification?.metadata?.title ||
                                              "Notifikasi"}
                                          </CardTitle>
                                          <p className="text-sm text-gray-600 leading-relaxed mb-2">
                                            {notification.notification?.message}
                                          </p>
                                          {notification.notification?.code_booking && (
                                            <p className="text-sm text-gray-800 font-mono mt-1 bg-gray-100 px-2 py-1 rounded">
                                              Kode: {notification.notification.code_booking}
                                            </p>
                                          )}
                                          <div className="flex flex-wrap items-center gap-2">
                                            {notification.notification?.type && (
                                              <Badge
                                                variant="outline"
                                                className="text-xs capitalize"
                                              >
                                                {notification.notification.type.replace("_", " ")}
                                              </Badge>
                                            )}
                                            {notification.notification?.booking_id && (
                                              <button
                                                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleNotificationClick();
                                                }}
                                              >
                                                ID: {notification.notification.booking_id}
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        {!notification.is_read && (
                                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        )}
                                        <span className="text-xs text-gray-500 text-right">
                                          {formatDate(notification.created_at)}
                                        </span>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-0 pb-4">
                                    <div className="flex flex-wrap gap-2">
                                      {notification.notification?.booking_id && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex items-center gap-1 text-xs h-8"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleNotificationClick();
                                          }}
                                        >
                                          <Eye className="h-3 w-3" />
                                          Lihat Detail
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 h-8 ml-auto"
                                        onClick={(e) => {
                                          e.stopPropagation();
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
                                        }}
                                      >
                                        <CloseIcon className="h-3 w-3" />
                                        <span className="hidden sm:inline">
                                          {notification.is_read ? "Dibaca" : "Tandai Dibaca"}
                                        </span>
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                                {/* Separator line between notifications */}
                                {index < notifications.length - 1 && (
                                  <div className="border-b border-gray-200 my-3"></div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              <Button
                size="sm"
                className="bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white"
              >
                <Activity className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* Outlet for child routes */}
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
