import React, { Suspense, useState, useEffect, useMemo } from "react";
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
import StaffPage from "./components/admin/StaffPage";
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
};

function AppContent() {
  // All hooks must be called at the top level and in the same order every render
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

  // Load tempo routes dynamically - moved to top level
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

  /*console.log("App.tsx - Current auth state:", {
    isAuthenticated,
    userRole,
    isAdmin,
    isHydrated,
  }); */

  // Set auth ready state when context is hydrated
  useEffect(() => {
    if (isHydrated) {
      setIsAuthReady(true);
    }
  }, [isHydrated]);

  // Enhanced session recovery with global trigger and immediate Supabase rehydration
  useEffect(() => {
    let recoveryTimeout: NodeJS.Timeout;
    let lastRecoveryTime = 0;
    const RECOVERY_COOLDOWN = 3000; // Increased cooldown to prevent loops
    let isRecovering = false; // Add recovery guard

    const recoverSession = async () => {
      const now = Date.now();
      if (now - lastRecoveryTime < RECOVERY_COOLDOWN || isRecovering) {
      /*  console.log(
          "[App] Recovery cooldown active or already recovering, skipping",
        );*/
        return;
      }

      isRecovering = true;

      // Check for loggedOut flag to prevent redirect loops
      const loggedOut = sessionStorage.getItem("loggedOut");
      if (loggedOut) {
      //  console.log("[App] Logged out flag detected, forcing session ready");
        sessionStorage.removeItem("loggedOut");
        setIsAuthReady(true);
        return;
      }

      lastRecoveryTime = now;
     // console.log("[App] Starting enhanced session recovery...");

      // Priority 1: Try Supabase session first for fresh data
      try {
       // console.log("[App] Attempting fresh Supabase session recovery...");
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!error && session?.user) {
         /* console.log(
            "[App] Fresh session found, triggering AuthContext update",
          );*/

          // Create consistent user data from fresh session
          const user = session.user;
          const userMeta = user.user_metadata || {};
          const isAdminEmail =
            user.email?.includes("admin") ||
            user.email === "divatranssoetta@gmail.com";

          const consistentUserData = {
            id: user.id,
            email: user.email || "",
            role: isAdminEmail ? "Admin" : userMeta.role || "Customer",
            name:
              userMeta.full_name ||
              userMeta.name ||
              user.email?.split("@")[0] ||
              "User",
          };

          // Dispatch event to trigger AuthContext update with fresh data
          window.dispatchEvent(
            new CustomEvent("forceSessionRestore", {
              detail: consistentUserData,
            }),
          );

          // Also dispatch session restored event for components
          window.dispatchEvent(
            new CustomEvent("sessionRestored", {
              detail: consistentUserData,
            }),
          );

      //  console.log("[App] Session recovered from fresh Supabase data");
          return;
        }
      } catch (error) {
      //  console.warn("[App] Supabase session recovery failed:", error);
      }

      // Priority 2: Fallback to localStorage for immediate recovery
      const storedUser = localStorage.getItem("auth_user");
      const storedUserName = localStorage.getItem("userName");
      const storedUserRole = localStorage.getItem("userRole");

      if (storedUser && (!isAuthenticated || !userId)) {
        try {
          const userData = JSON.parse(storedUser);
          if (userData && userData.id && userData.email) {
         //   console.log("[App] Fallback session recovery from localStorage");

            // Create consistent user data object
            const consistentUserData = {
              id: userData.id,
              email: userData.email,
              role: storedUserRole || userData.role || "Customer",
              name:
                storedUserName ||
                userData.name ||
                userData.email?.split("@")[0] ||
                "User",
            };

            // Dispatch event to trigger AuthContext update
            window.dispatchEvent(
              new CustomEvent("forceSessionRestore", {
                detail: consistentUserData,
              }),
            );

            // Also dispatch session restored event for components
            window.dispatchEvent(
              new CustomEvent("sessionRestored", {
                detail: consistentUserData,
              }),
            );
            return;
          }
        } catch (error) {
       //   console.warn("[App] Error parsing stored user data:", error);
        }
      }

     // console.log("[App] No valid session found during recovery");
      isRecovering = false; // Reset recovery guard
    };

    // Enhanced visibility change handler with immediate session rehydration and throttling
    let lastVisibilityTime = 0;
    const VISIBILITY_THROTTLE = 5000; // 5 second throttle for visibility changes

    const handleVisibilityChange = async () => {
      const now = Date.now();
      if (now - lastVisibilityTime < VISIBILITY_THROTTLE) {
        console.log("[App] Visibility change throttled");
        return;
      }
      lastVisibilityTime = now;

      if (document.visibilityState === "visible" && isHydrated) {
        console.log(
          "[App] Tab became visible, triggering immediate session rehydration",
        );

        // Clear any existing timeout
        if (recoveryTimeout) clearTimeout(recoveryTimeout);

        // Immediate session check - prioritize fresh Supabase data
        const needsRecovery = !isAuthenticated || !userId || !userRole;

        if (needsRecovery && !isRecovering) {
          console.log(
            "[App] Session state incomplete, triggering immediate recovery",
            { isAuthenticated, userId: !!userId, userRole: !!userRole },
          );
          // Immediate recovery attempt
          await recoverSession();
        } else {
          // Even if we have auth state, refresh from Supabase for consistency
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session?.user && session.user.id !== userId) {
              console.log("[App] Session user mismatch detected, updating");
              await recoverSession();
            }
          } catch (error) {
            console.warn("[App] Error checking session consistency:", error);
          }
        }

        // Debounced additional recovery for safety with guard check
        recoveryTimeout = setTimeout(async () => {
          // Final check if we still don't have valid auth state and not already recovering
          if (
            (!isAuthenticated || !userRole || !userId) &&
            !isRecovering &&
            isHydrated
          ) {
            console.log(
              "[App] Final auth state check failed, attempting recovery",
            );
            await recoverSession();
          }
        }, 1000); // Increased timeout to prevent rapid recovery attempts
      }
    };

    // Listen for custom session restore events
    const handleForceSessionRestore = (event: CustomEvent) => {
    //  console.log("[App] Force session restore event received:", event.detail);
      // Trigger AuthContext sync
      window.dispatchEvent(
        new CustomEvent("authStateRefreshed", { detail: event.detail }),
      );
    };

    // Listen for force session ready events
    const handleForceSessionReady = () => {
    //  console.log("[App] Force session ready event received");
      setIsAuthReady(true);
    };

    // Initial recovery attempt
    recoverSession();

    // Listen for visibility changes and custom events
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener(
      "forceSessionRestore",
      handleForceSessionRestore as EventListener,
    );
    window.addEventListener(
      "forceSessionReady",
      handleForceSessionReady as EventListener,
    );

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener(
        "forceSessionRestore",
        handleForceSessionRestore as EventListener,
      );
      window.removeEventListener(
        "forceSessionReady",
        handleForceSessionReady as EventListener,
      );
      if (recoveryTimeout) clearTimeout(recoveryTimeout);
      isRecovering = false; // Reset recovery guard on cleanup
    };
  }, [isAuthenticated, isLoading, userRole, userId, isHydrated]);

  // Role-based redirects
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const currentPath = window.location.pathname;

      // Clear any logout flags to ensure proper authentication state
      sessionStorage.removeItem("loggedOut");

      // CRITICAL: Check for restricted roles and force logout immediately
      const restrictedRoles = ["Agent", "Driver Perusahaan", "Driver Mitra"];
      if (userRole && restrictedRoles.includes(userRole)) {
     /*   console.log(
          "[App] RESTRICTED ROLE DETECTED - FORCING LOGOUT:",
          userRole,
        );*/

        // Clear all auth data immediately
        localStorage.removeItem("auth_user");
        localStorage.removeItem("userId");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        localStorage.removeItem("userPhone");
        localStorage.removeItem("userRole");
        localStorage.removeItem("isAdmin");
        sessionStorage.clear();

        // Sign out from Supabase and force page reload
        supabase.auth
          .signOut({ scope: "global" })
          .then(() => {
          //  console.log("[App] Successfully signed out restricted user");
            window.location.href = "/";
          })
          .catch((error) => {
            console.error("[App] Error signing out restricted user:", error);
            window.location.href = "/";
          });

        return; // Stop further execution
      }

      // Debug output to help diagnose issues
    /*  console.log("Current authentication state:", {
        isAuthenticated,
        userRole,
        isAdmin,
        userEmail,
        currentPath,
      });*/

      // CONSOLIDATED ADMIN/STAFF ROUTING - All admin and staff roles go to admin dashboard
      const adminStaffRoles = [
        ROLES.ADMIN,
        ROLES.SUPER_ADMIN,
        ROLES.STAFF,
        ROLES.STAFF_TRIPS,
        ROLES.STAFF_TRAFFIC,
        "Staff Admin",
        "Super Admin",
        "Staff Trips",
        "Staff Traffic",
        "Staff",
        "Admin"
      ];

     /* console.log("Checking role for admin dashboard redirect:", {
        userRole,
        isAdmin,
        isInAdminStaffRoles: adminStaffRoles.includes(userRole),
        currentPath,
        allRoles: adminStaffRoles
      });*/

      // Handle role object from database join (role.role_name) or direct string
      let resolvedUserRole = userRole;
      if (userRole && typeof userRole === 'object' && userRole.role_name) {
        resolvedUserRole = userRole.role_name;
      }

      // Check if user should be redirected to admin dashboard
      const shouldRedirectToAdmin = adminStaffRoles.includes(resolvedUserRole) || isAdmin;
      
      // CRITICAL FIX: Only redirect to admin if user is actually admin/staff AND not a customer
      // Prevent redirection for Customer role users and role_id 10
      const isCustomerRole = resolvedUserRole === "Customer" || resolvedUserRole === ROLES.CUSTOMER;
      const hasCustomerRoleId = localStorage.getItem("userRole") === "Customer";
      
      if (shouldRedirectToAdmin && !isCustomerRole && !hasCustomerRoleId) {
     /*   console.log(
          "Admin/Staff user detected, redirecting to admin dashboard",
          { userRole, resolvedUserRole, isAdmin, currentPath, shouldRedirectToAdmin },
        );*/
        // Always redirect admin/staff users to admin dashboard if they're not already there
        if (!currentPath.includes("/admin")) {
         // console.log("Navigating to admin dashboard...");
          // Use navigate with replace: true to prevent back button issues
          navigate("/admin", { replace: true });
        }
      } else {
       // console.log("No redirect needed for role:", { userRole, resolvedUserRole });
        if (userRole === ROLES.DRIVER_PERUSAHAAN) {
          navigate("/driver-profile");
        }
        // For Customer role, stay on current page (no redirection)
        const isCustomerRole = resolvedUserRole === "Customer" || resolvedUserRole === ROLES.CUSTOMER;
        const hasCustomerRoleId = localStorage.getItem("userRole") === "Customer";
        
        if (isCustomerRole || hasCustomerRoleId) {
         /* console.log("Customer user detected, staying on current page", {
            resolvedUserRole,
            storedRole: localStorage.getItem("userRole")
          });*/
        }
      }
    }
  }, [isAuthenticated, isLoading, userRole, isAdmin, userEmail, navigate]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (!isSessionReady) {
      const timeout = setTimeout(() => {
        console.warn(
          "[App] Session loading timeout reached, forcing ready state",
        );
        // Force session ready if it takes too long
        setIsAuthReady(true);
        window.dispatchEvent(new CustomEvent("forceSessionReady"));
      }, 5000); // Reduced to 5 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isSessionReady]);

  const ProtectedRoute = ({
    children,
    requiredRole,
    allowedRoles,
  }: {
    children: JSX.Element;
    requiredRole?: string;
    allowedRoles?: string[];
  }) => {
    if (isLoading) {
      return <div>Loading...</div>;
    }

    // Special case for admin - check both isAdmin flag and userRole
    // This ensures that users with admin emails or admin roles can access admin routes
    if (isAdmin || userRole === ROLES.ADMIN || userRole === ROLES.SUPER_ADMIN) {
    /*  console.log(
        "Admin access granted via isAdmin flag or Admin/Super Admin role",
        { isAdmin, userRole },
      );*/
      return children;
    }

    if (!isAuthenticated) {
    //  console.log("Not authenticated, redirecting to home");
      return <Navigate to="/" />;
    }

    console.log("Protected route check:", {
      userRole,
      requiredRole,
      allowedRoles,
      isAdmin,
    });

    if (requiredRole && userRole !== requiredRole) {
      console.log(
        `Access denied: User role ${userRole} does not match required role ${requiredRole}`,
      );
      return <Navigate to="/" />;
    }

    // Handle role object from database join (role.role_name) or direct string
    let resolvedUserRole = userRole;
    if (userRole && typeof userRole === 'object' && userRole.role_name) {
      resolvedUserRole = userRole.role_name;
    }

    if (allowedRoles && !allowedRoles.includes(resolvedUserRole || "")) {
      console.log(
        `Access denied: User role ${resolvedUserRole} is not in allowed roles [${allowedRoles.join(", ")}]`,
      );
      return <Navigate to="/" />;
    }

    return children;
  };

  // Move useRoutes call outside of JSX to prevent hooks order violation
  // Only call useRoutes when tempo routes are loaded and available
  const tempoRoutes = useMemo(() => {
    if (
      !tempoRoutesLoaded ||
      !import.meta.env.VITE_TEMPO ||
      routes.length === 0
    ) {
      return null;
    }
    return routes;
  }, [tempoRoutesLoaded, routes]);

  // Use useRoutes conditionally but consistently
  const renderedTempoRoutes = useRoutes(tempoRoutes || []);

  return (
    <div className="min-h-screen w-full">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <p>Loading...</p>
          </div>
        }
      >
        {/* Main application routes */}
        <Routes>
          {/* Public routes - no authentication required */}
          <Route path="/" element={<TravelPage />} />
          <Route path="/baggage" element={<AirportBaggage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route
            path="/airport-preview/:previewCode"
            element={<AirportTransferPreview />}
          />

          <Route path="/payment/form/:id" element={<PaymentFormPage />} />
          <Route path="/payment/form/:id/*" element={<PaymentFormPage />} />
          <Route path="/payment/:id" element={<PaymentDetailsPage />} />
          <Route path="/thank-you/:paymentId" element={<ThankYouPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route
            path="/damage-payment/:bookingId"
            element={<DamagePaymentForm />}
          />
          <Route
            path="damage-payment/:bookingId"
            element={<DamagePaymentForm />}
          />
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
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/bookings" element={<BookingsPage />} />
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
                ]}
              >
                <NewBookingPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
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
                ]}
              >
                <AdminLayout />
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
                  ROLES.STAFF_TRIPS,
                  ROLES.STAFF_TRAFFIC,
                  "Staff Admin",
                  "Super Admin",
                ]}
              >
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="customers" element={<CustomerManagement />} />
            <Route path="drivers" element={<DriverManagement />} />
            <Route path="cars" element={<CarsManagement />} />
            <Route path="payments" element={<Payments />} />
            <Route path="bookings" element={<BookingManagement />} />
            <Route
              path="bookings/customer"
              element={<BookingManagementCustomer />}
            />
            <Route
              path="bookings/driver"
              element={<BookingManagementDriver />}
            />
            <Route path="staff" element={<StaffPage />} />
            <Route path="inspections" element={<InspectionManagement />} />
            <Route path="checklist" element={<ChecklistManagement />} />
            <Route path="damages" element={<DamageManagement />} />
            <Route path="vehicle-inventory" element={<VehicleInventory />} />
            <Route
              path="airport-transfer"
              element={<AirportTransferManagement />}
            />
            <Route path="api-settings" element={<ApiSettings />} />
            <Route path="dispatcher" element={<DispatcherPage />} />
            <Route path="data-agent" element={<AgentManagement />} />
            <Route path="booking-agent" element={<BookingAgentManagement />} />
            <Route path="top-up-agent" element={<TopUpAgent />} />
            <Route path="history-top-up" element={<HistoryTopUp />} />
            <Route path="top-up-requests" element={<TopUpAgentRequests />} />
            <Route path="topup-driver" element={<TopUpDriver />} />
            <Route path="price-km" element={<PriceKMManagement />} />
            <Route
              path="payment-methods"
              element={<PaymentMethodsManagement />}
            />
            <Route path="paylabs-settings" element={<PaylabsSettings />} />
            <Route
              path="baggage-booking"
              element={<BaggageBookingManagement />}
            />
            <Route path="price-baggage" element={<PriceBaggage />} />
            <Route path="chart" element={<ChartManagement />} />
            <Route
              path="handling-booking"
              element={<HandlingBookingManagement />}
            />
            <Route
              path="handling-services"
              element={<HandlingServicesManagement />}
            />
            <Route
              path="damage-payment/:bookingId"
              element={<DamagePaymentForm />}
            />
          </Route>

          {/* Tempo routes fallback - only if not already handled */}
          {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>

        {/* Tempo routes for storyboards - rendered separately */}
        {tempoRoutes && renderedTempoRoutes}
      </Suspense>
      <Toaster />
    </div>
  );
}

function App() {
  // Clear any stale authentication flags on initial load
  React.useEffect(() => {
    // Remove any session flags that might interfere with authentication
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