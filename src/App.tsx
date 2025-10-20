import React, { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import ProfilePage from "./pages/ProfilePage";
import BookingsPage from "./pages/BookingsPage";
import ApiSettings from "./components/admin/ApiSettings";
import PriceKMManagement from "./components/admin/PriceKMManagement";
import PriceBaggage from "./components/admin/PriceBaggage";
import PaymentMethodsManagement from "./components/admin/PaymentMethodsManagement";
import PaylabsSettings from "./components/admin/PaylabsSettings";
import BaggageBookingManagement from "./components/admin/BaggageBookingManagement";
import ChartManagement from "./components/admin/ChartManagement";
import { Toaster } from "@/components/ui/toaster";
import {
  useRoutes,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import AirportTransferPreview from "./pages/AirportTransferPreview";
import DamagePaymentForm from "./components/payment/DamagePaymentForm";
import RentCar from "./components/RentCar";
import TravelPage from "./pages/TravelPage";
import ModelDetailPage from "./pages/ModelDetailPage";
import PaymentDetailsPage from "./pages/PaymentDetailsPage";
import PaymentFormPage from "./pages/PaymentFormPage";
import CheckoutPage from "./pages/CheckoutPage";
import ThankYouPage from "./pages/ThankYouPage";
import BookingPage from "./pages/BookingPage";
import NewBookingPage from "./pages/NewBookingPage";
import BookingForm from "./components/booking/BookingForm";
import ShoppingCart from "./components/booking/ShoppingCart";
import AdminDashboard from "./components/admin/AdminDashboard";
import AdminLayout from "./components/admin/AdminLayout";
import StaffManagement from "./components/admin/StaffManagement";
import CustomerManagement from "./components/admin/CustomerManagement";
import DriverManagement from "./components/admin/DriverManagement";
import CarsManagement from "./components/admin/CarsManagement";
import Payments from "./components/admin/Payments";
import BookingManagement from "./components/admin/BookingManagement";
import BookingManagementConnected from "./components/admin/BookingManagementConnected";
import BookingManagementCustomer from "./components/admin/BookingManagementCustomer";
import BookingManagementDriver from "./components/admin/BookingManagementDriver";
import InspectionManagement from "./components/admin/InspectionManagement";
import ChecklistManagement from "./components/admin/ChecklistManagement";
import DamageManagement from "./components/admin/DamageManagement";
import VehicleInventory from "./components/admin/VehicleInventory";
import AirportTransferManagement from "./components/admin/AirportTransferManagement";
import AirportTransferPage from "./pages/AirportTransferPage";
import AirportBaggage from "./pages/AirportBaggage";
import DriverMitraPage from "./pages/DriverMitraPage";
import DriverPerusahaanPage from "./pages/DriverPerusahaanPage";
import DriverProfile from "./components/DriverProfile";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ShoppingCartProvider } from "@/hooks/useShoppingCart";
import { supabase } from "@/lib/supabase";
import HotelsPage from "./pages/HotelsPage";
import FlightsPage from "./pages/FlightsPage";
import TrainsPage from "./pages/TrainsPage";
import BusPage from "./pages/BusPage";
import ActivitiesPage from "./pages/ActivitiesPage";
import HandlingPage from "./pages/HandlingPage";
import HandlingBookingManagement from "./components/admin/HandlingBookingManagement";
import HandlingServicesManagement from "./components/admin/HandlingServicesManagement";
import DispatcherPage from "./components/admin/DispatcherPage";
import AgentManagement from "./components/admin/AgentManagement";
import BookingAgentManagement from "./components/admin/BookingAgentManagement";
import TopUpAgent from "./components/admin/TopUpAgent";
import TopUpAgentRequests from "./components/admin/TopUpAgentRequests";
import HistoryTopUp from "./components/admin/HistoryTopUp";
import TopUpDriver from "./components/admin/TopUpDriver";
import TransportasiPage from "./pages/TransportasiPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DriverDetailPage from "./pages/DriverDetailPage";
import IasBookingGroup from "./components/admin/IasBookingGroup";
import Reports from "./components/admin/Reports";
import BookingAndProfileUserPage from "./pages/Booking&ProfileUserPage";
import PurchaseRequestManagement from "./components/admin/PurchaseRequestManagement";
import AgentDetailsPage from "./pages/AgentDetailsPage";
import StocksManagement from "./components/admin/StocksManagement";

declare global {
  interface Window {
    __TEMPO_ROUTES__?: any[];
  }
}

const ROLES = {
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
  STAFF: "Staff",
  STAFF_TRIPS: "Staff Trips",
  STAFF_TRAFFIC: "Staff Traffic",
  CUSTOMER: "Customer",
  DRIVER_MITRA: "Driver Mitra",
  DRIVER_PERUSAHAAN: "Driver Perusahaan",
  STAFF_IAS: "Staff Ias",
  STAFF_ADMIN_SPORT_CENTER: "Staff Admin Sport Center",
  STAFF_ADMIN_POOL: "Staff Admin Pool",
};

function AppContent() {
  const {
    isAuthenticated,
    userRole,
    userId,
    isLoading,
    userEmail,
    isAdmin,
    isHydrated,
    isSessionReady,
  } = useAuth();
  const navigate = useNavigate();
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [tempoRoutesLoaded, setTempoRoutesLoaded] = useState(false);

  // CRITICAL: Handle PASSWORD_RECOVERY event untuk redirect ke reset-password
  useEffect(() => {
    let isPasswordRecoveryActive = false;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log('[App] PASSWORD_RECOVERY detected, setting recovery mode and navigating');
        isPasswordRecoveryActive = true;
        
        // Force clear any existing auth state
        localStorage.removeItem("auth_user");
        sessionStorage.removeItem("loggedOut");
        sessionStorage.removeItem("forceLogout");
        sessionStorage.removeItem("signOutInProgress");
        
        navigate("/reset-password", { replace: true });
      }
      
      // Block any other auth events during password recovery
      if (isPasswordRecoveryActive && event !== "PASSWORD_RECOVERY" && event !== "SIGNED_OUT") {
        console.log('[App] BLOCKING auth event during password recovery:', event);
        
        // Allow ALL session-related events during password recovery
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
          console.log('[App] Allowing', event, 'during password recovery for session establishment');
          return; // Allow but don't process further
        }
        
        return;
      }
      
      // Reset recovery mode on sign out
      if (event === "SIGNED_OUT") {
        isPasswordRecoveryActive = false;
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Move useRoutes call to top level - CRITICAL for hook order consistency
  const tempoRoutes = useMemo(() => {
    if (!tempoRoutesLoaded || !import.meta.env.VITE_TEMPO || routes.length === 0) {
      return [];
    }
    return routes;
  }, [tempoRoutesLoaded, routes]);

  const renderedTempoRoutes = useRoutes(tempoRoutes);

  useEffect(() => {
    const loadTempoRoutes = async () => {
      try {
        if (import.meta.env.VITE_TEMPO) {
          const tempoModule = await import("tempo-routes");
          setRoutes(tempoModule.default || []);
          setTempoRoutesLoaded(true);
        } else {
          setTempoRoutesLoaded(true);
        }
      } catch (error) {
        console.warn("Tempo routes not available:", error);
        setRoutes([]);
        setTempoRoutesLoaded(true);
      }
    };
    loadTempoRoutes();
  }, []);

  useEffect(() => {
    if (isHydrated && isSessionReady) {
      setIsAuthReady(true);
    }
  }, [isHydrated, isSessionReady]);

  useEffect(() => {
    let recoveryTimeout: NodeJS.Timeout;
    let lastRecoveryTime = 0;
    const RECOVERY_COOLDOWN = 5000;
    let isRecovering = false;

    const recoverSession = async () => {
      // CRITICAL: Don't recover session if this is a PASSWORD_RECOVERY flow
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const type = params.get('type');
        
        if (type === 'recovery') {
          console.log('[App] PASSWORD_RECOVERY detected in recoverSession - blocking recovery');
          return; // Don't recover session during password recovery
        }
      }

      const now = Date.now();
      if (now - lastRecoveryTime < RECOVERY_COOLDOWN || isRecovering) {
        return;
      }
      if (isAuthenticated && userId && userRole && isSessionReady) {
        return;
      }
      isRecovering = true;
      lastRecoveryTime = now;

      const loggedOut = sessionStorage.getItem("loggedOut");
      if (loggedOut) {
        sessionStorage.removeItem("loggedOut");
        setIsAuthReady(true);
        isRecovering = false;
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!error && session?.user) {
          const user = session.user;
          const userMeta = user.user_metadata || {};
          const isAdminEmail = user.email?.includes("admin") || user.email === "divatranssoetta@gmail.com";

          const consistentUserData = {
            id: user.id,
            email: user.email || "",
            role: isAdminEmail ? "Admin" : userMeta.role || "Customer",
            name: userMeta.full_name || userMeta.name || user.email?.split("@")[0] || "User",
          };

          window.dispatchEvent(
            new CustomEvent("forceSessionRestore", {
              detail: consistentUserData,
            })
          );
          isRecovering = false;
          return;
        }
      } catch (error) {}

      const storedUser = localStorage.getItem("auth_user");
      if (storedUser && (!isAuthenticated || !userId)) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.id && userData.email) {
            const consistentUserData = {
              id: userData.id,
              email: userData.email,
              role: userData.role || "Customer",
              name: userData.name || userData.email?.split("@")[0] || "User",
            };

            window.dispatchEvent(
              new CustomEvent("forceSessionRestore", {
                detail: consistentUserData,
              })
            );
            isRecovering = false;
            return;
          }
        } catch (error) {}
      }

      isRecovering = false;
    };

    let lastVisibilityTime = 0;
    const VISIBILITY_THROTTLE = 10000;

    const handleVisibilityChange = async () => {
      // CRITICAL: Don't handle visibility change during PASSWORD_RECOVERY
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.replace('#', ''));
        const type = params.get('type');
        
        if (type === 'recovery') {
          console.log('[App] PASSWORD_RECOVERY detected in visibility change - blocking');
          return;
        }
      }

      const now = Date.now();
      if (now - lastVisibilityTime < VISIBILITY_THROTTLE) {
        return;
      }
      lastVisibilityTime = now;

      if (document.visibilityState === "visible" && isHydrated) {
        if (isAuthenticated && userId && userRole && isSessionReady) {
          return;
        }

        const needsRecovery = !isAuthenticated || !userId || !userRole || !isSessionReady;
        if (needsRecovery && !isRecovering) {
          if (recoveryTimeout) clearTimeout(recoveryTimeout);
          recoveryTimeout = setTimeout(async () => {
            if ((!isAuthenticated || !userRole || !userId || !isSessionReady) && !isRecovering && isHydrated) {
              await recoverSession();
            }
          }, 1000);
        }
      }
    };

    const handleForceSessionRestore = (event: CustomEvent) => {
      window.dispatchEvent(
        new CustomEvent("authStateRefreshed", { detail: event.detail })
      );
    };

    const handleForceSessionReady = () => {
      setIsAuthReady(true);
    };

    // CRITICAL: Don't run recovery if this is PASSWORD_RECOVERY
    const hash = window.location.hash;
    let isPasswordRecovery = false;
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const type = params.get('type');
      isPasswordRecovery = type === 'recovery';
    }

    if (isHydrated && (!isAuthenticated || !userId || !userRole || !isSessionReady) && !isPasswordRecovery) {
      recoverSession();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("forceSessionRestore", handleForceSessionRestore as EventListener);
    window.addEventListener("forceSessionReady", handleForceSessionReady as EventListener);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("forceSessionRestore", handleForceSessionRestore as EventListener);
      window.removeEventListener("forceSessionReady", handleForceSessionReady as EventListener);
      if (recoveryTimeout) clearTimeout(recoveryTimeout);
    };
  }, [isAuthenticated, userId, userRole, isSessionReady, isHydrated]);

  useEffect(() => {
    if (isAuthenticated && !isLoading && isAuthReady) {
      const currentPath = window.location.pathname;
      sessionStorage.removeItem("loggedOut");

      const restrictedRoles = ["Agent", "Driver Perusahaan", "Driver Mitra"];
      if (userRole && restrictedRoles.includes(userRole)) {
        localStorage.clear();
        sessionStorage.clear();
        supabase.auth.signOut({ scope: "global" }).then(() => {
          window.location.href = "/";
        }).catch(() => {
          window.location.href = "/";
        });
        return;
      }

      const adminStaffRoles = [
        ROLES.ADMIN,
        ROLES.SUPER_ADMIN,
        ROLES.STAFF,
        ROLES.STAFF_IAS,
        ROLES.STAFF_TRIPS,
        ROLES.STAFF_TRAFFIC,
        ROLES.STAFF_ADMIN_SPORT_CENTER,
        "Staff Admin",
        "Super Admin",
        "Staff Trips",
        "Staff Traffic",
        "Staff",
        "Staff Ias",
        "Admin",
        "Staff Admin Sport Center",
        "Staff Admin Pool"
        
      ];

      let resolvedUserRole = userRole;
      if (userRole && typeof userRole === 'object' && userRole.role_name) {
        resolvedUserRole = userRole.role_name;
      }

      const shouldRedirectToAdmin = adminStaffRoles.includes(resolvedUserRole) || isAdmin;
      const isCustomerRole = resolvedUserRole === "Customer" || resolvedUserRole === ROLES.CUSTOMER;
      const hasCustomerRoleId = localStorage.getItem("userRole") === "Customer";
      
      if (shouldRedirectToAdmin && !isCustomerRole && !hasCustomerRoleId) {
        if (!currentPath.includes("/admin")) {
          navigate("/admin", { replace: true });
        }
      } else if (userRole === ROLES.DRIVER_PERUSAHAAN) {
        navigate("/driver-profile", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, userRole, isAdmin, userEmail, navigate, isAuthReady]);

  useEffect(() => {
    if (!isSessionReady && !isLoading) {
      const timeout = setTimeout(() => {
        setIsAuthReady(true);
        window.dispatchEvent(new CustomEvent("forceSessionReady"));
      }, 8000);

      return () => clearTimeout(timeout);
    }
  }, [isSessionReady, isLoading]);

  const ProtectedRoute = ({
    children,
    requiredRole,
    allowedRoles,
  }: {
    children: JSX.Element;
    requiredRole?: string;
    allowedRoles?: string[];
  }) => {
    if (!isAuthReady || isLoading) {
      return <div>Loading...</div>;
    }

    if (!isAuthReady || isLoading) {
      return <div>Loading...</div>;
    }

    if (isAdmin || userRole === ROLES.ADMIN || userRole === ROLES.SUPER_ADMIN) {
      return children;
    }

    if (!isAuthenticated) {
      return <Navigate to="/" replace />;
    }

    if (requiredRole && userRole !== requiredRole) {
      return <Navigate to="/" replace />;
    }

    let resolvedUserRole = userRole;
    if (userRole && typeof userRole === 'object' && userRole.role_name) {
      resolvedUserRole = userRole.role_name;
    }

    if (allowedRoles && !allowedRoles.includes(resolvedUserRole || "")) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <div className="min-h-screen w-full">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <p>Loading...</p>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<TravelPage />} />
          <Route path="/baggage" element={<AirportBaggage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/airport-preview/:previewCode" element={<AirportTransferPreview />} />
          <Route path="/payment/form/:id" element={<PaymentFormPage />} />
          <Route path="/payment/form/:id/*" element={<PaymentFormPage />} />
          <Route path="/payment/:id" element={<PaymentDetailsPage />} />
          <Route path="/thank-you/:paymentId" element={<ThankYouPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/damage-payment/:bookingId" element={<DamagePaymentForm />} />
          <Route path="damage-payment/:bookingId" element={<DamagePaymentForm />} />
          <Route path="/home" element={<RentCar />} />
          <Route path="/sub-account" element={<TravelPage />} />
          <Route path="/rentcar" element={<RentCar />} />
          <Route path="/models/:modelName" element={<ModelDetailPage />} />
          <Route path="/models/:modelName/*" element={<ModelDetailPage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/booking/:vehicle_id" element={<BookingPage />} />
          <Route path="/booking/:vehicleId" element={<BookingForm />} />
          <Route path="/booking/model/:model_name" element={<BookingPage />} />
          <Route path="/airport-transfer" element={<AirportTransferPage />} />
          <Route path="/cart" element={<ShoppingCart />} />
          <Route path="/driver-mitra" element={<DriverMitraPage />} />
          <Route path="/driver-perusahaan" element={<DriverPerusahaanPage />} />
          <Route path="/driver-profile" element={<DriverProfile />} />
          <Route path="/my-bookings" element={<BookingAndProfileUserPage />} />
          <Route path="/profile" element={<BookingAndProfileUserPage />} />
          <Route path="/hotels" element={<HotelsPage />} />
          <Route path="/flights" element={<FlightsPage />} />
          <Route path="/trains" element={<TrainsPage />} />
          <Route path="/bus-travel" element={<BusPage />} />
          <Route path="/things-to-do" element={<ActivitiesPage />} />
          <Route path="/handling" element={<HandlingPage />} />
          <Route path="/transportasi" element={<TransportasiPage />} />
          
          <Route
            path="/new-booking"
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.ADMIN,
                  ROLES.SUPER_ADMIN,
                  ROLES.STAFF,
                  ROLES.STAFF_TRIPS,
                  ROLES.STAFF_TRAFFIC,
                  "Staff Admin",
                  "Super Admin",
                  "Staff Ias",
                ]}
              >
                <NewBookingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute
                allowedRoles={[
                  ROLES.ADMIN,
                  ROLES.SUPER_ADMIN,
                  ROLES.STAFF,
                  ROLES.STAFF_IAS,
                  ROLES.STAFF_TRIPS,
                  ROLES.STAFF_TRAFFIC,
                  ROLES.STAFF_ADMIN_SPORT_CENTER,
                  "Staff Admin",
                  "Super Admin",
                  "Staff Admin Sport Center",
                  "Staff Admin Pool"
                ]}
              >
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="concierge-group" element={<IasBookingGroup />} />
            <Route path="drivers" element={<DriverManagement />} />
            <Route path="cars" element={<CarsManagement />} />
            <Route path="stocks" element={<StocksManagement />} />
            <Route path="purchase-requests" element={<PurchaseRequestManagement />} />
            <Route path="payments" element={<Payments />} />
            <Route path="bookings" element={<BookingManagement />} />
            <Route path="bookings/customer" element={<BookingManagementCustomer />} />
            <Route path="bookings/driver" element={<BookingManagementDriver />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="inspections" element={<InspectionManagement />} />
            <Route path="checklist" element={<ChecklistManagement />} />
            <Route path="damages" element={<DamageManagement />} />
            <Route path="vehicle-inventory" element={<VehicleInventory />} />
            <Route path="airport-transfer" element={<AirportTransferManagement />} />
            <Route path="api-settings" element={<ApiSettings />} />
            <Route path="dispatcher" element={<DispatcherPage />} />
            <Route path="data-agent" element={<AgentManagement />} />
            <Route path="agent-details/:agentId" element={<AgentDetailsPage />} />
            <Route path="booking-agent" element={<BookingAgentManagement />} />
            <Route path="top-up-agent" element={<TopUpAgent />} />
            <Route path="history-top-up" element={<HistoryTopUp />} />
            <Route path="top-up-requests" element={<TopUpAgentRequests />} />
            <Route path="topup-driver" element={<TopUpDriver />} />
            <Route path="price-km" element={<PriceKMManagement />} />
            <Route path="payment-methods" element={<PaymentMethodsManagement />} />
            <Route path="paylabs-settings" element={<PaylabsSettings />} />
            <Route path="baggage-booking" element={<BaggageBookingManagement />} />
            <Route path="price-baggage" element={<PriceBaggage />} />
            <Route path="chart" element={<ChartManagement />} />
            <Route path="handling-booking" element={<HandlingBookingManagement />} />
            <Route path="handling-services" element={<HandlingServicesManagement />} />
            <Route path="reports" element={<Reports />} />
            <Route path="damage-payment/:bookingId" element={<DamagePaymentForm />} />
            <Route path="drivers/:id" element={<DriverDetailPage />} />
          </Route>

          {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {tempoRoutesLoaded && tempoRoutes.length > 0 && renderedTempoRoutes}
      </Suspense>
      <Toaster />
    </div>
  );
}

function App() {
  React.useEffect(() => {
    sessionStorage.removeItem("forceLogout");
  }, []);

  return (
    <AuthProvider>
      <ShoppingCartProvider>
        <AppContent />
      </ShoppingCartProvider>
    </AuthProvider>
  );
}

export default App;