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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [carsDriverOpen, setCarsDriverOpen] = React.useState(false);
  const [baggageServiceOpen, setBaggageServiceOpen] = React.useState(false);
  const [handlingServiceOpen, setHandlingServiceOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  // Get dashboard title based on user role
  const getDashboardTitle = () => {
    switch (userRole) {
      case "Staff Trips":
        return "Staff Trips Dashboard";
      case "Staff Traffic":
        return "Staff Traffic Dashboard";
      case "Admin":
        return "Admin Dashboard";
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
      console.error("Error signing out:", error);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-20"} bg-gradient-to-b from-primary-tosca to-primary-dark backdrop-blur-sm border-r border-white/10 transition-all duration-300 h-screen overflow-y-auto fixed left-0 top-0 z-10 shadow-lg`}
      >
        <div className="p-5 border-b border-white/20 flex items-center justify-between bg-gradient-to-r from-primary-dark to-primary-tosca">
          <div
            className={`flex items-center ${!sidebarOpen && "justify-center w-full"}`}
          >
            <Car className="h-6 w-6 text-white" />
            {sidebarOpen && (
              <span className="ml-2 font-bold text-lg tracking-tight text-white">
                Admin Panel
              </span>
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

                {/* 4. Bookings - Show for Staff Traffic */}
                <Link
                  to="/admin/bookings"
                  className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/bookings") ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen && "justify-center"}`}
                >
                  <CalendarDays className="h-5 w-5 text-white" />
                  {sidebarOpen && <span className="ml-3">Bookings</span>}
                </Link>

                {/* 5. Payments - Hide for Staff Traffic */}
                {userRole !== "Staff Traffic" && (
                  <Link
                    to="/admin/payments"
                    className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/payments") ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen && "justify-center"}`}
                  >
                    <CreditCard className="h-5 w-5 text-white" />
                    {sidebarOpen && <span className="ml-3">Payments</span>}
                  </Link>
                )}

                {/* Payment Methods - Hide for Staff Traffic */}
                {userRole !== "Staff Traffic" && (
                  <Link
                    to="/admin/payment-methods"
                    className={`flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${location.pathname.includes("/admin/payment-methods") ? "bg-white/20 font-medium text-white" : "text-white/80"} ${!sidebarOpen ? "justify-center" : ""}`}
                  >
                    <Wallet className="h-5 w-5 text-white" />
                    {sidebarOpen && (
                      <span className="ml-3">Payment Methods</span>
                    )}
                  </Link>
                )}

                {/* 6. Cars & Driver Menu - Show for Staff Traffic */}
                <div>
                  <button
                    onClick={() => setCarsDriverOpen(!carsDriverOpen)}
                    className={`w-full flex items-center p-3 rounded-lg hover:bg-white/20 transition-colors duration-200 ${
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
            {userRole !== "Staff Trips" && userRole !== "Staff Traffic" && (
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
              <Button
                variant="outline"
                size="sm"
                className="border-primary-tosca/30 hover:bg-primary-tosca/10 text-primary-dark"
              >
                <BarChart3 className="h-4 w-4 mr-2 text-primary-tosca" />
                Reports
              </Button>
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
