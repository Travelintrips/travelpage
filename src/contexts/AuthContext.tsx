import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  userPhone: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  isCheckingSession: boolean;
  isSessionReady: boolean;
  signOut: () => Promise<void>;
  forceRefreshSession: () => Promise<void>;
  ensureSessionReady: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const initializationRef = useRef(false);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [contextReady, setContextReady] = useState(false);

  const initializeSession = useCallback(async () => {
    if (initializationRef.current) {
    //  console.log("[AuthContext] Session initialization already in progress");
      return;
    }

    // Add additional guard to prevent rapid re-initialization
    const lastInitTime = sessionStorage.getItem("lastSessionInit");
    const now = Date.now();
    if (lastInitTime && now - parseInt(lastInitTime) < 1000) {
    // console.log("[AuthContext] Session initialization throttled");
      return;
    }
    sessionStorage.setItem("lastSessionInit", now.toString());

    initializationRef.current = true;
    setIsLoading(true);
    setIsSessionReady(false);

    // Prevent flickering by batching state updates
    const batchedStateUpdate = (updates: any) => {
      Object.keys(updates).forEach((key) => {
        if (key === "session") setSession(updates[key]);
        if (key === "user") setUser(updates[key]);
        if (key === "role") setRole(updates[key]);
        if (key === "isLoading") setIsLoading(updates[key]);
        if (key === "isHydrated") setIsHydrated(updates[key]);
        if (key === "isSessionReady") setIsSessionReady(updates[key]);
      });
    };

    try {
    //  console.log("[AuthContext] Starting session initialization...");

      // Clear any existing timeout
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }

      // Check if we're in a production environment without proper Supabase config
      const isProductionWithoutSupabase =
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        (!import.meta.env.VITE_SUPABASE_URL ||
          import.meta.env.VITE_SUPABASE_URL === "" ||
          import.meta.env.VITE_SUPABASE_URL.includes("placeholder"));

      if (isProductionWithoutSupabase) {
        console.warn(
          "[AuthContext] Production environment detected without proper Supabase configuration",
        );
        // Try to restore from localStorage immediately
        const storedUser = localStorage.getItem("auth_user");
        const storedUserId = localStorage.getItem("userId");

        if (storedUser && storedUserId) {
          try {
            const userData = JSON.parse(storedUser);
            console.log(
              "[AuthContext] Restoring session from localStorage in production",
            );

            setUser({
              id: userData.id,
              email: userData.email,
              user_metadata: {
                name: userData.name || "User",
                role: userData.role || "Customer",
                phone: userData.phone || "",
              },
            });
            setRole(userData.role || "Customer");
            setSession({
              user: userData,
              access_token: "production_fallback",
            });

            setIsLoading(false);
            setIsHydrated(true);
            setIsSessionReady(true);
            initializationRef.current = false;
            return;
          } catch (parseError) {
            console.warn(
              "[AuthContext] Error parsing stored user in production:",
              parseError,
            );
          }
        }

        // No stored session, set as unauthenticated - batch updates to prevent flickering
        batchedStateUpdate({
          session: null,
          user: null,
          role: null,
          isLoading: false,
          isHydrated: true,
          isSessionReady: true,
        });
        initializationRef.current = false;
        return;
      }

      // Get current session from Supabase with timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Session check timeout")), 3000);
      });

      const { data, error } = (await Promise.race([
        sessionPromise,
        timeoutPromise,
      ])) as any;

      if (error || !data.session) {
       // console.log("[AuthContext] No valid Supabase session found");

        // Try localStorage fallback only if truly offline
        const storedUser = localStorage.getItem("auth_user");
        const storedUserId = localStorage.getItem("userId");
        const storedUserEmail = localStorage.getItem("userEmail");
        const storedUserRole = localStorage.getItem("userRole");

        if (
          storedUser &&
          storedUserId &&
          storedUserEmail &&
          navigator.onLine === false
        ) {
          console.log(
            "[AuthContext] Using localStorage fallback (offline mode)",
          );
          try {
            const userData = JSON.parse(storedUser);
            const storedUserPhone = localStorage.getItem("userPhone");

            setUser({
              id: storedUserId,
              email: storedUserEmail,
              user_metadata: {
                name:
                  userData.name || localStorage.getItem("userName") || "User",
                role: storedUserRole || "Customer",
                phone: storedUserPhone || userData.phone || "",
              },
            });
            setRole(storedUserRole || "Customer");

            // Create a mock session for offline mode
            setSession({
              user: {
                id: storedUserId,
                email: storedUserEmail,
                user_metadata: {
                  name: userData.name,
                  role: storedUserRole,
                  phone: storedUserPhone || userData.phone,
                },
              },
              access_token: "offline_mode",
            });
          } catch (parseError) {
            console.warn(
              "[AuthContext] Error parsing stored user data:",
              parseError,
            );
            setSession(null);
            setUser(null);
            setRole(null);
          }
        } else {
          // Clear everything if no valid session - batch updates to prevent flickering
          batchedStateUpdate({
            session: null,
            user: null,
            role: null,
          });

          // Clear localStorage if session is invalid
          localStorage.removeItem("auth_user");
          localStorage.removeItem("userId");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userName");
          localStorage.removeItem("userPhone");
          localStorage.removeItem("userRole");
        }
      } else {
        console.log(
          "[AuthContext] Valid Supabase session found, updating state",
        );
        // Batch initial session updates to prevent flickering
        const sessionUpdates: any = {
          session: data.session,
          user: data.session.user,
        };

        // Get user role from database first, then fallback to metadata
        let userRole = "Customer"; // ALWAYS default to Customer for new users
        let userName =
          data.session.user.user_metadata?.name ||
          data.session.user.email?.split("@")[0] ||
          "User";
        let userPhone = data.session.user.user_metadata?.phone || "";

        // Check if this is during admin user creation to preserve admin role
        const adminCreatingUser = sessionStorage.getItem("adminCreatingUser");
        const currentAdminId = sessionStorage.getItem("currentAdminId");
        const blockAuthChanges = sessionStorage.getItem(
          "blockAuthStateChanges",
        );

        if (
          (adminCreatingUser === "true" &&
            currentAdminId === data.session.user.id) ||
          blockAuthChanges === "true"
        ) {
        //  console.log(
         //   "[AuthContext] Preserving admin role during user creation process",
        //  );
          userRole = "Admin";
        } else {
          // CRITICAL: Absolute priority for Robby Dua - ALWAYS use Staff Admin role
          if (data.session.user.id === '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26' && 
              data.session.user.email === 'robbyadmin1@gmail.com') {
          // console.log("[AuthContext] ABSOLUTE PRIORITY: Forcing Staff Admin role for Robby Dua (ignoring database)");
            userRole = "Staff Admin";
          }
          // CRITICAL: Only check for admin role if email contains admin or specific admin email
          else if (
            data.session.user.email?.includes("admin") ||
            data.session.user.email === "divatranssoetta@gmail.com"
          ) {
            console.log(
              "[AuthContext] Admin email detected:",
              data.session.user.email,
            );
            userRole = "Admin";
          } else {
            // For non-admin emails, try to get user data from database with timeout
            try {
              const userDataPromise = supabase
                .from("users")
                .select("full_name, phone, role_id, role, role:roles(role_name)")
                .eq("id", data.session.user.id)
                .single();

              const dbTimeoutPromise = new Promise((_, reject) => {
                setTimeout(
                  () => reject(new Error("Database fetch timeout")),
                  3000,
                );
              });

              const { data: dbUserData } = (await Promise.race([
                userDataPromise,
                dbTimeoutPromise,
              ])) as any;

          //    console.log("[AuthContext] Database user data:", {
          //      userId: data.session.user.id,
          //      email: data.session.user.email,
          //      dbUserData: dbUserData,
          //      roleFromJoin: dbUserData?.role?.role_name,
          //      roleFromColumn: dbUserData?.role,
          //      roleId: dbUserData?.role_id,
          //      fullName: dbUserData?.full_name
          //    });

              if (dbUserData) {
                if (dbUserData.full_name) userName = dbUserData.full_name;
                if (dbUserData.phone) userPhone = dbUserData.phone;

                // CRITICAL: Prioritize direct role column over join, then check role_id mapping
                let determinedRole = null;
                
                // First check direct role column (prioritize this for consistency)
                if (dbUserData.role && typeof dbUserData.role === 'string' && dbUserData.role !== "Admin") {
                  determinedRole = dbUserData.role;
                //  console.log("[AuthContext] Using direct role column:", determinedRole);
                }
                // Then check role from join table
                else if (
                  dbUserData.role?.role_name &&
                  dbUserData.role.role_name !== "Admin"
                ) {
                  determinedRole = dbUserData.role.role_name;
                //  console.log("[AuthContext] Using role from join:", determinedRole);
                }
                // Handle case where role is an object but we need the string value
                else if (dbUserData.role && typeof dbUserData.role === 'object' && dbUserData.role.role_name) {
                  determinedRole = dbUserData.role.role_name;
                  console.log("[AuthContext] Using role object's role_name:", determinedRole);
                }
                // Finally check if we need to map role_id to role name
                else if (dbUserData.role_id) {
                  // Map role_id to role names based on database schema
                  const roleIdMapping: { [key: number]: string } = {
                    1: "Admin",
                    2: "Driver Mitra", 
                    3: "Driver Perusahaan",
                    4: "Agent",
                    5: "Staff",
                    6: "Staff Admin",
                    7: "Staff Trips",
                    8: "Staff Traffic",
                    10: "Customer",
                    99: "Super Admin"
                  };
                  
                  if (roleIdMapping[dbUserData.role_id]) {
                    determinedRole = roleIdMapping[dbUserData.role_id];
                  //  console.log("[AuthContext] Using role_id mapping:", {
                  //    role_id: dbUserData.role_id,
                  //    mapped_role: determinedRole
                  //  });
                  }
                }

                if (determinedRole) {
                  // Ensure role is always a string, not an object
                  if (typeof determinedRole === 'object' && determinedRole.role_name) {
                    userRole = determinedRole.role_name;
                  } else {
                    userRole = determinedRole;
                  }
                 // console.log("[AuthContext] Final determined role:", userRole);
                } else {
                  // Force Customer role for non-admin emails
                  userRole = "Customer";
                  console.log(
                    "[AuthContext] No role found, forcing Customer role:",
                    userRole,
                  );
                }

                // CRITICAL: Check for restricted roles and immediately sign out
                const restrictedRoles = [
                  "Agent",
                  "Driver Perusahaan",
                  "Driver Mitra",
                ];
                if (restrictedRoles.includes(userRole)) {
                //  console.log(
                 //   "[AuthContext] RESTRICTED ROLE DETECTED - SIGNING OUT:",
                 //   userRole,
               //   );

                  try {
                    await supabase.auth.signOut({ scope: "global" });
                  //  console.log(
                  //    "[AuthContext] Successfully signed out restricted user",
                 //   );
                  } catch (signOutError) {
                  //  console.error(
                  //    "[AuthContext] Error signing out restricted user:",
                  //    signOutError,
                 //   );
                  }

                  // Clear all auth data
                  localStorage.removeItem("auth_user");
                  localStorage.removeItem("userId");
                  localStorage.removeItem("userEmail");
                  localStorage.removeItem("userName");
                  localStorage.removeItem("userPhone");
                  localStorage.removeItem("userRole");
                  localStorage.removeItem("isAdmin");
                  sessionStorage.clear();

                  // Set state to unauthenticated
                  batchedStateUpdate({
                    session: null,
                    user: null,
                    role: null,
                    isLoading: false,
                    isHydrated: true,
                    isSessionReady: true,
                  });
                  initializationRef.current = false;
                  return;
                }
              } else {
                // Force Customer role if no database data for non-admin emails
                userRole = "Customer";
             //   console.log(
             //     "[AuthContext] No database data, forcing Customer role:",
             //     userRole,
             //   );
              }
            } catch (dbError) {
              console.warn(
                "[AuthContext] Error fetching user data from database:",
                dbError,
              );
              // Force Customer role on database error for non-admin emails
              userRole = "Customer";
            //  console.log(
            //    "[AuthContext] Database error, forcing Customer role:",
            //    userRole,
            //  );
            }

            // Only check staff table if user is not already determined to be Customer
            if (userRole === "Customer") {
              try {
                const staffDataPromise = supabase
                  .from("staff")
                  .select("role, full_name, phone")
                  .eq("id", data.session.user.id)
                  .maybeSingle();

                const staffTimeoutPromise = new Promise((_, reject) => {
                  setTimeout(
                    () => reject(new Error("Staff fetch timeout")),
                    3000,
                  );
                });

                const { data: staffData, error: staffError } =
                  (await Promise.race([
                    staffDataPromise,
                    staffTimeoutPromise,
                  ])) as any;

              //  console.log("[AuthContext] Staff table data:", {
              //    userId: data.session.user.id,
              //    staffData: staffData,
              //    staffError: staffError
              //  });

                if (
                  !staffError &&
                  staffData &&
                  staffData.role &&
                  staffData.role !== "Admin"
                ) {
                  userRole = staffData.role;
                // console.log("[AuthContext] Found staff role:", userRole);
                  
                  // Update user info from staff table if available
                  if (staffData.full_name) userName = staffData.full_name;
                  if (staffData.phone) userPhone = staffData.phone;
                } else if (staffError) {
                  console.warn(
                    "[AuthContext] Error fetching staff data:",
                    staffError,
                  );
                }
              } catch (staffError) {
                console.warn(
                  "[AuthContext] Error fetching staff data:",
                  staffError,
                );
              }
            }
          }
        }

        // CRITICAL: FINAL ABSOLUTE OVERRIDE for Robby Dua - ALWAYS Staff Admin
        if (data.session.user.id === '9c5a5d3d-4d40-4011-adf4-fbdee4dc4c26' && 
            data.session.user.email === 'robbyadmin1@gmail.com') {
        // console.log("[AuthContext] FINAL ABSOLUTE OVERRIDE: Setting Staff Admin role for Robby Dua (ignoring all database values)");
          userRole = "Staff Admin";
          
          // Force update user metadata to ensure consistency
          try {
            await supabase.auth.updateUser({
              data: {
                ...data.session.user.user_metadata,
                role: "Staff Admin"
              }
            });
          // console.log("[AuthContext] Updated user metadata to Staff Admin for Robby Dua");
          } catch (metadataError) {
           // console.warn("[AuthContext] Failed to update metadata for Robby Dua:", metadataError);
          }
        }

        // Set the role in state after determining it - add to batch update
        sessionUpdates.role = userRole;

        // Apply all session updates at once to prevent flickering
        batchedStateUpdate(sessionUpdates);

        // Update localStorage with fresh session data
        const userData = {
          id: data.session.user.id,
          email: data.session.user.email,
          name: userName,
          phone: userPhone,
          role: userRole,
        };

        // Update localStorage
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("userId", data.session.user.id);
        localStorage.setItem("userEmail", data.session.user.email || "");
        localStorage.setItem("userName", userName);
        localStorage.setItem("userPhone", userPhone);
        localStorage.setItem("userRole", userRole);

        // Check if user is admin - prioritize role over email pattern
        const isAdminByRole = userRole === "Admin";
        const isAdminEmail =
          data.session.user.email?.includes("admin") ||
          data.session.user.email === "divatranssoetta@gmail.com";
        const isAdmin = isAdminByRole || isAdminEmail;

        localStorage.setItem("isAdmin", isAdmin ? "true" : "false");

       // console.log("[AuthContext] Admin status determined:", {
       //   isAdminByRole,
       //   isAdminEmail,
      //    isAdmin,
      //    userRole,
      //  });

        // Log final user data for debugging
      //  console.log("[AuthContext] Final user data object:", {
       //   id: data.session.user.id,
       //   role: userRole,
       //   email: data.session.user.email,
       //   name: userName
     //   });

        // Dispatch session restored event
        window.dispatchEvent(
          new CustomEvent("sessionRestored", {
            detail: {
              id: data.session.user.id,
              email: data.session.user.email,
              name: userName,
              role: userRole,
              phone: userPhone,
            },
          }),
        );
      }
    } catch (err) {
    //  console.error("[AuthContext] Error during session initialization:", err);

      // Enhanced fallback for production environments
      const storedUser = localStorage.getItem("auth_user");
      const storedUserId = localStorage.getItem("userId");

      if (storedUser && storedUserId) {
        try {
          const userData = JSON.parse(storedUser);
        //  console.log("[AuthContext] Using localStorage fallback after error");

          setUser({
            id: userData.id,
            email: userData.email,
            user_metadata: {
              name: userData.name,
              role: userData.role || "Customer",
              phone: userData.phone || "",
            },
          });
          setRole(userData.role || "Customer");
          setSession({
            user: userData,
            access_token: "fallback_mode",
          });
        } catch (parseError) {
          console.warn(
            "[AuthContext] Error parsing stored user in error fallback:",
            parseError,
          );
          setSession(null);
          setUser(null);
          setRole(null);
        }
      } else {
        // Clear everything if no fallback available
        setSession(null);
        setUser(null);
        setRole(null);
      }
    } finally {
      // Final batch update to prevent flickering
      batchedStateUpdate({
        isLoading: false,
        isHydrated: true,
        isSessionReady: true,
      });
      initializationRef.current = false;
    //  console.log("[AuthContext] Session initialization completed");
    }
  }, []);

  const forceRefreshSession = useCallback(async () => {
    setIsCheckingSession(true);
    try {
     // console.log("[AuthContext] Starting force refresh session...");

      // Create timeout promise with reduced duration
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Session check timeout")), 5000);
      });

      // First try to get current session without refresh
      const sessionPromise = supabase.auth.getSession();
      const { data: currentData, error: currentError } = (await Promise.race([
        sessionPromise,
        timeoutPromise,
      ])) as any;

      if (!currentError && currentData.session?.user) {
        console.log("[AuthContext] Valid session found without refresh");
        setSession(currentData.session);
        setUser(currentData.session.user);
        setRole(currentData.session.user?.user_metadata?.role || null);
        setIsSessionReady(true);

        // Update localStorage with fresh session data
        const userData = {
          id: currentData.session.user.id,
          email: currentData.session.user.email,
          name:
            currentData.session.user.user_metadata?.name ||
            currentData.session.user.email?.split("@")[0] ||
            "User",
          phone: currentData.session.user.user_metadata?.phone || "",
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("userId", currentData.session.user.id);
        localStorage.setItem("userEmail", currentData.session.user.email || "");
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("userPhone", userData.phone);
        localStorage.setItem(
          "userRole",
          currentData.session.user?.user_metadata?.role || "Customer",
        );

        // Re-dispatch session restored event after validation
        window.dispatchEvent(
          new CustomEvent("sessionRestored", {
            detail: {
              id: currentData.session.user.id,
              email: currentData.session.user.email,
              name: userData.name,
              role: currentData.session.user?.user_metadata?.role || "Customer",
            },
          }),
        );
        return;
      }

      // If no valid session, try refresh with timeout
     // console.log("[AuthContext] No current session, attempting refresh...");
      const refreshPromise = supabase.auth.refreshSession();
      const refreshTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Refresh timeout")), 8000);
      });
      const { data, error } = (await Promise.race([
        refreshPromise,
        refreshTimeoutPromise,
      ])) as any;

      if (error) {
      //  console.warn("[AuthContext] Session refresh failed:", error);
        // Try to restore from localStorage as fallback
        const storedUser = localStorage.getItem("auth_user");
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
          //  console.log(
          //    "[AuthContext] Attempting to restore from localStorage:",
          //    userData.email,
         //   );
            // Don't clear session state, keep existing data
            setIsSessionReady(true);
            return;
          } catch (parseError) {
          //  console.warn(
           //   "[AuthContext] Error parsing stored user:",
          //    parseError,
          //  );
          }
        }

        // Clear invalid session state only if no localStorage fallback
        setSession(null);
        setUser(null);
        setRole(null);
        setIsSessionReady(true);
      } else if (data.session) {
    //    console.log("[AuthContext] Session refreshed successfully");
        setSession(data.session);
        setUser(data.session.user);
        setRole(data.session.user?.user_metadata?.role || null);
        setIsSessionReady(true);

        // Update localStorage with refreshed session data
        const userData = {
          id: data.session.user.id,
          email: data.session.user.email,
          name:
            data.session.user.user_metadata?.name ||
            data.session.user.email?.split("@")[0] ||
            "User",
          phone: data.session.user.user_metadata?.phone || "",
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("userId", data.session.user.id);
        localStorage.setItem("userEmail", data.session.user.email || "");
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("userPhone", userData.phone);
        localStorage.setItem(
          "userRole",
          data.session.user?.user_metadata?.role || "Customer",
        );

        // Re-dispatch session restored event after refresh
        window.dispatchEvent(
          new CustomEvent("sessionRestored", {
            detail: {
              id: data.session.user.id,
              email: data.session.user.email,
              name: userData.name,
              role: data.session.user?.user_metadata?.role || "Customer",
            },
          }),
        );
      } else {
        // No session available
      //  console.log("[AuthContext] No session available after refresh");
        setSession(null);
        setUser(null);
        setRole(null);
        setIsSessionReady(true);
      }
    } catch (error) {
    //  console.error("[AuthContext] Failed to refresh session", error);
      // Try localStorage fallback before clearing everything
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          console.log(
            "[AuthContext] Using localStorage fallback after error:",
            userData.email,
          );
          setIsSessionReady(true);
          return;
        } catch (parseError) {
          console.warn(
            "[AuthContext] Error parsing stored user in fallback:",
            parseError,
          );
        }
      }

      // Always set session ready to prevent stuck state
      setSession(null);
      setUser(null);
      setRole(null);
      setIsSessionReady(true);
    } finally {
      // CRITICAL: Always reset checking state
      setIsCheckingSession(false);
    }
  }, []);

  const ensureSessionReady = useCallback(async () => {
    if (!isSessionReady || isLoading) {
      console.log("[AuthContext] Ensuring session is ready...");
      await initializeSession();
    }
  }, [isSessionReady, isLoading, initializeSession]);

  const signOut = async () => {
    sessionStorage.setItem("loggedOut", "true");

    setSession(null);
    setUser(null);
    setRole(null);
    setIsHydrated(true);
    setIsSessionReady(true);

    localStorage.removeItem("auth_user");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("userPhone");
    localStorage.removeItem("isAdmin");

    await supabase.auth.signOut();
    window.location.href = "/";
  };

  useEffect(() => {
    // Initialize session on mount
    initializeSession();

    // Set up auth state change listener with error handling and loop prevention
    let lastAuthStateChangeTime = 0;
    const AUTH_STATE_THROTTLE = 1000; // 1 second throttle

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const now = Date.now();
        if (now - lastAuthStateChangeTime < AUTH_STATE_THROTTLE) {
        {/*  console.log(`[AuthContext] Auth state change throttled: ${event}`);*/}
          return;
        }
        lastAuthStateChangeTime = now;

       {/* console.log(`[AuthContext] Auth state changed: ${event}`);*/}

        // CRITICAL: Block all auth state changes during staff creation
        const blockAuthChanges = sessionStorage.getItem(
          "blockAuthStateChanges",
        );
        const preventAutoLogin = sessionStorage.getItem("preventAutoLogin");
        const staffCreationInProgress = sessionStorage.getItem(
          "staffCreationInProgress",
        );
        const adminCreatingUser = sessionStorage.getItem("adminCreatingUser");
        const currentAdminId = sessionStorage.getItem("currentAdminId");

        if (
          blockAuthChanges === "true" ||
          preventAutoLogin === "true" ||
          staffCreationInProgress === "true" ||
          adminCreatingUser === "true"
        ) {
         /* console.log(
            "[AuthContext] BLOCKING auth state change during staff creation",
            {
              blockAuthChanges,
              preventAutoLogin,
              staffCreationInProgress,
              adminCreatingUser,
            },
          );*/

          // If this is a SIGNED_IN event during staff creation, immediately sign out the new user
          if (event === "SIGNED_IN" && session?.user) {
          /*  console.log(
              "[AuthContext] Detected SIGNED_IN event during staff creation - blocking and restoring admin",
              { newUserId: session.user.id, newUserEmail: session.user.email },
            );*/

            // Immediately sign out the new user session to prevent auto-login
            try {
           /*   console.log(
                "[AuthContext] Signing out newly created staff user immediately",
              );
              await supabase.auth.signOut({ scope: "global" });
              console.log(
                "[AuthContext] Successfully signed out new staff user",
              );*/
            } catch (signOutError) {
              console.warn(
                "[AuthContext] Failed to sign out new staff user:",
                signOutError,
              );
            }

            // Restore admin session from preserved data or localStorage
            const preservedAdminSession = sessionStorage.getItem(
              "preservedAdminSession",
            );

            let adminData = null;
            if (preservedAdminSession) {
              try {
                adminData = JSON.parse(preservedAdminSession);
              } catch (parseError) {
                console.warn(
                  "[AuthContext] Error parsing preserved admin session:",
                  parseError,
                );
              }
            }

            // Fallback to localStorage if no preserved session
            if (!adminData) {
              const storedUser = localStorage.getItem("auth_user");
              if (storedUser) {
                try {
                  adminData = JSON.parse(storedUser);
                  if (adminData.role !== "Admin") {
                    adminData.role = "Admin"; // Force admin role
                  }
                } catch (parseError) {
                  console.warn(
                    "[AuthContext] Error parsing stored user:",
                    parseError,
                  );
                }
              }
            }

            if (adminData && adminData.id && adminData.email) {
              console.log(
                "[AuthContext] Restoring admin session after blocking staff auto-login",
                { adminId: adminData.id, adminEmail: adminData.email },
              );

              // Restore admin session state
              setUser({
                id: adminData.id,
                email: adminData.email,
                user_metadata: {
                  name: adminData.name || "Admin",
                  role: "Admin",
                  phone: adminData.phone || "",
                },
              });
              setRole("Admin");
              setSession({
                user: {
                  id: adminData.id,
                  email: adminData.email,
                  user_metadata: {
                    name: adminData.name || "Admin",
                    role: "Admin",
                    phone: adminData.phone || "",
                  },
                },
                access_token: "admin_restored_after_staff_creation",
              });

              // Update localStorage to ensure consistency
              localStorage.setItem("auth_user", JSON.stringify(adminData));
              localStorage.setItem("userId", adminData.id);
              localStorage.setItem("userEmail", adminData.email);
              localStorage.setItem("userName", adminData.name || "Admin");
              localStorage.setItem("userRole", "Admin");
              localStorage.setItem("isAdmin", "true");

              console.log(
                "[AuthContext] Admin session restored successfully after blocking staff auto-login",
              );
            } else {
              console.error(
                "[AuthContext] No admin data found to restore session!",
              );
            }
          }

          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user && isHydrated) {
            // Check if this is an admin creating a staff account
            const currentUserId = user?.id;
            const newUserId = session.user.id;
            const currentUserRole = role;

            // Check session storage flags for admin creating user
            const adminCreatingUser =
              sessionStorage.getItem("adminCreatingUser");
            const currentAdminId = sessionStorage.getItem("currentAdminId");
            const currentAdminEmail =
              sessionStorage.getItem("currentAdminEmail");

            console.log(
              `[AuthContext] Session change detected - Current: ${currentUserId} (${currentUserRole}), New: ${newUserId}`,
            );
            console.log(
              `[AuthContext] Admin flags - Creating: ${adminCreatingUser}, Admin ID: ${currentAdminId}`,
            );

            // CRITICAL: Enhanced admin session protection
            const currentUserIsAdmin =
              currentUserRole === "Admin" ||
              user?.email?.includes("admin") ||
              user?.email === "divatranssoetta@gmail.com" ||
              localStorage.getItem("isAdmin") === "true";

            // CRITICAL: Always prioritize admin session restoration during user creation
            if (adminCreatingUser === "true" && currentAdminId) {
              console.log(
                `[AuthContext] Admin creating user - BLOCKING session switch completely`,
              );

              // IMMEDIATELY sign out any new session to prevent auto-login
              try {
                console.log(
                  "[AuthContext] Immediately signing out new user session",
                );
                // Use global scope to ensure complete sign out
                await supabase.auth.signOut({ scope: "global" });
                console.log(
                  "[AuthContext] Successfully signed out newly created user",
                );
              } catch (signOutError) {
                console.warn(
                  "[AuthContext] Failed to sign out new user:",
                  signOutError,
                );
              }

              // Force restore admin session immediately from localStorage
              const storedAdminUser = localStorage.getItem("auth_user");
              if (storedAdminUser) {
                try {
                  const adminUserData = JSON.parse(storedAdminUser);
                  if (
                    adminUserData.id === currentAdminId &&
                    adminUserData.role === "Admin"
                  ) {
                    console.log(
                      "[AuthContext] FORCE restoring admin session immediately",
                    );

                    // Restore admin session state immediately
                    setUser({
                      id: adminUserData.id,
                      email: adminUserData.email,
                      user_metadata: {
                        name: adminUserData.name,
                        role: "Admin",
                        phone: adminUserData.phone || "",
                      },
                    });
                    setRole("Admin");
                    setSession({
                      user: {
                        id: adminUserData.id,
                        email: adminUserData.email,
                        user_metadata: {
                          name: adminUserData.name,
                          role: "Admin",
                          phone: adminUserData.phone || "",
                        },
                      },
                      access_token: "admin_restored_immediate",
                    });

                    // Update localStorage to ensure admin role is preserved
                    localStorage.setItem("userRole", "Admin");
                    localStorage.setItem("isAdmin", "true");

                    console.log(
                      "[AuthContext] Admin session restored immediately - BLOCKING new user session",
                    );
                  }
                } catch (parseError) {
                  console.warn(
                    "[AuthContext] Failed to parse admin user:",
                    parseError,
                  );
                }
              }

              // CRITICAL: Completely block this session change and prevent any state updates
              console.log(
                "[AuthContext] BLOCKING all session state changes during staff creation",
              );
              return;
            }

            // Enhanced protection for admin sessions (even without creation flags)
            if (
              currentUserId &&
              currentUserId !== newUserId &&
              currentUserIsAdmin
            ) {
              console.log(
                `[AuthContext] Protecting admin session from being overwritten`,
                { currentUserId, newUserId, currentUserRole },
              );

              // Check if stored user is admin and matches current user
              const storedUser = localStorage.getItem("auth_user");
              if (storedUser) {
                try {
                  const userData = JSON.parse(storedUser);
                  if (
                    userData.role === "Admin" &&
                    userData.id === currentUserId
                  ) {
                    console.log(
                      "[AuthContext] Maintaining admin session - blocking session change",
                    );

                    // Immediately sign out the new session to prevent it from taking over
                    try {
                      await supabase.auth.signOut();
                      console.log(
                        "[AuthContext] Signed out conflicting session",
                      );
                    } catch (signOutError) {
                      console.warn(
                        "[AuthContext] Failed to sign out conflicting session:",
                        signOutError,
                      );
                    }

                    // Force maintain current admin session state
                    setUser({
                      id: userData.id,
                      email: userData.email,
                      user_metadata: {
                        name: userData.name,
                        role: "Admin",
                        phone: userData.phone || "",
                      },
                    });
                    setRole("Admin");
                    setSession({
                      user: {
                        id: userData.id,
                        email: userData.email,
                        user_metadata: {
                          name: userData.name,
                          role: "Admin",
                          phone: userData.phone || "",
                        },
                      },
                      access_token: "admin_protected_session",
                    });

                    return; // Don't update session
                  }
                } catch (parseError) {
                  console.warn(
                    "[AuthContext] Error parsing stored user:",
                    parseError,
                  );
                }
              }
            }

            // Only update state if there's an actual change to prevent loops
            if (
              session.user.id !== user?.id ||
              session.user.email !== user?.email
            ) {
              setSession(session);
              setUser(session.user);
              setRole(session.user?.user_metadata?.role || "Customer");
              setIsSessionReady(true);
            }

            // Update localStorage with fresh data
            const userData = {
              id: session.user.id,
              email: session.user.email,
              name:
                session.user.user_metadata?.name ||
                session.user.email?.split("@")[0] ||
                "User",
              phone: session.user.user_metadata?.phone || "",
              role: session.user.user_metadata?.role || "Customer",
            };

            localStorage.setItem("auth_user", JSON.stringify(userData));
            localStorage.setItem("userId", session.user.id);
            localStorage.setItem("userEmail", session.user.email || "");
            localStorage.setItem("userName", userData.name);
            localStorage.setItem("userPhone", userData.phone);
            localStorage.setItem("userRole", userData.role);

            // Dispatch session restored event
            window.dispatchEvent(
              new CustomEvent("sessionRestored", {
                detail: userData,
              }),
            );
          }
        }

        if (event === "SIGNED_OUT") {
          // Check if this is a sign out during admin user creation
          const adminCreatingUser = sessionStorage.getItem("adminCreatingUser");
          const currentAdminId = sessionStorage.getItem("currentAdminId");
          const blockAuthChanges = sessionStorage.getItem(
            "blockAuthStateChanges",
          );
          const preventAutoLogin = sessionStorage.getItem("preventAutoLogin");
          const staffCreationInProgress = sessionStorage.getItem(
            "staffCreationInProgress",
          );

          if (
            (adminCreatingUser === "true" && currentAdminId) ||
            blockAuthChanges === "true" ||
            preventAutoLogin === "true" ||
            staffCreationInProgress === "true"
          ) {
            console.log(
              "[AuthContext] Sign out during admin user creation - maintaining admin session",
              {
                adminCreatingUser,
                blockAuthChanges,
                preventAutoLogin,
                staffCreationInProgress,
              },
            );

            // Restore admin session from preserved data if available
            const preservedAdminSession = sessionStorage.getItem(
              "preservedAdminSession",
            );
            if (preservedAdminSession) {
              try {
                const adminData = JSON.parse(preservedAdminSession);
                console.log(
                  "[AuthContext] Restoring admin session after sign out during staff creation",
                );

                setUser({
                  id: adminData.id,
                  email: adminData.email,
                  user_metadata: {
                    name: adminData.name,
                    role: "Admin",
                    phone: "",
                  },
                });
                setRole("Admin");
                setSession({
                  user: {
                    id: adminData.id,
                    email: adminData.email,
                    user_metadata: {
                      name: adminData.name,
                      role: "Admin",
                      phone: "",
                    },
                  },
                  access_token: "admin_restored_after_signout",
                });
              } catch (parseError) {
                console.warn(
                  "[AuthContext] Error parsing preserved admin session:",
                  parseError,
                );
              }
            }

            // Don't clear admin session during user creation
            return;
          }

          setSession(null);
          setUser(null);
          setRole(null);
          setIsSessionReady(false);

          // Clear localStorage
          localStorage.removeItem("auth_user");
          localStorage.removeItem("userId");
          localStorage.removeItem("userEmail");
          localStorage.removeItem("userName");
          localStorage.removeItem("userPhone");
          localStorage.removeItem("userRole");
          localStorage.removeItem("isAdmin");
        }
      },
    );

    // Enhanced visibility change listener with admin session protection and throttling
    let lastVisibilityChangeTime = 0;
    const VISIBILITY_THROTTLE = 2000; // 2 second throttle

    const handleVisibilityChange = async () => {
      const now = Date.now();
      if (now - lastVisibilityChangeTime < VISIBILITY_THROTTLE) {
        console.log("[AuthContext] Visibility change throttled");
        return;
      }
      lastVisibilityChangeTime = now;

      if (
        document.visibilityState === "visible" &&
        !initializationRef.current &&
        isHydrated
      ) {
        console.log(
          "[AuthContext] Tab became visible, checking session state...",
        );

        // Check if admin is creating user to prevent session switching
        const adminCreatingUser = sessionStorage.getItem("adminCreatingUser");
        const currentAdminId = sessionStorage.getItem("currentAdminId");
        const currentAdminEmail = sessionStorage.getItem("currentAdminEmail");

        // Enhanced admin session protection
        const currentUserIsAdmin =
          role === "Admin" ||
          user?.email?.includes("admin") ||
          user?.email === "divatranssoetta@gmail.com" ||
          localStorage.getItem("isAdmin") === "true";

        if (adminCreatingUser === "true" && currentAdminId) {
          console.log(
            "[AuthContext] Admin creating user detected, maintaining admin session",
          );

          // Restore admin session from localStorage
          const storedAdminUser = localStorage.getItem("auth_user");
          if (storedAdminUser) {
            try {
              const adminUserData = JSON.parse(storedAdminUser);
              if (
                adminUserData.id === currentAdminId &&
                adminUserData.role === "Admin"
              ) {
                console.log(
                  "[AuthContext] Restoring admin session on tab switch",
                );

                setUser({
                  id: adminUserData.id,
                  email: adminUserData.email,
                  user_metadata: {
                    name: adminUserData.name,
                    role: adminUserData.role,
                    phone: adminUserData.phone || "",
                  },
                });
                setRole(adminUserData.role);
                setSession({
                  user: {
                    id: adminUserData.id,
                    email: adminUserData.email,
                    user_metadata: {
                      name: adminUserData.name,
                      role: adminUserData.role,
                      phone: adminUserData.phone || "",
                    },
                  },
                  access_token: "admin_restored_tab_switch",
                });

                console.log(
                  "[AuthContext] Admin session restored successfully on tab switch",
                );
                return;
              }
            } catch (parseError) {
              console.warn(
                "[AuthContext] Failed to parse stored admin user on tab switch:",
                parseError,
              );
            }
          }
        }

        // Additional protection for admin users even without creation flags
        if (currentUserIsAdmin) {
          console.log(
            "[AuthContext] Current user is admin, protecting session on tab switch",
            { role, userEmail: user?.email, userId: user?.id },
          );

          // Check if Supabase session matches current admin user
          try {
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (session?.user?.id && session.user.id !== user?.id) {
              console.log(
                "[AuthContext] Admin session mismatch on tab switch, maintaining admin session",
                { currentUserId: user?.id, sessionUserId: session.user.id },
              );

              // Force maintain admin session from localStorage
              const storedUser = localStorage.getItem("auth_user");
              if (storedUser) {
                try {
                  const adminUserData = JSON.parse(storedUser);
                  if (
                    adminUserData.role === "Admin" &&
                    adminUserData.id === user?.id
                  ) {
                    console.log(
                      "[AuthContext] Maintaining admin session from localStorage on tab switch",
                    );
                    // Don't reinitialize session, keep current admin state
                    return;
                  }
                } catch (parseError) {
                  console.warn(
                    "[AuthContext] Error parsing stored admin user:",
                    parseError,
                  );
                }
              }
            }
          } catch (error) {
            console.warn(
              "[AuthContext] Error checking session on admin tab switch:",
              error,
            );
          }

          // For admin users, don't proceed with session reinitialization
          return;
        }

        // Add small delay to prevent rapid fire (for non-admin users only)
        setTimeout(async () => {
          if (!initializationRef.current && isHydrated && !currentUserIsAdmin) {
            try {
              const {
                data: { session },
              } = await supabase.auth.getSession();

              // Only update if session state has changed and not during admin user creation
              if (
                session?.user?.id !== user?.id &&
                adminCreatingUser !== "true"
              ) {
                console.log(
                  "[AuthContext] Non-admin session state changed, reinitializing...",
                );
                await initializeSession();
              } else if (adminCreatingUser === "true") {
                console.log(
                  "[AuthContext] BLOCKING session reinitialization during admin user creation",
                );
                // Force maintain admin session during user creation
                const storedAdminUser = localStorage.getItem("auth_user");
                if (storedAdminUser) {
                  try {
                    const adminUserData = JSON.parse(storedAdminUser);
                    if (adminUserData.role === "Admin") {
                      console.log(
                        "[AuthContext] Maintaining admin session during user creation",
                      );
                      setUser({
                        id: adminUserData.id,
                        email: adminUserData.email,
                        user_metadata: {
                          name: adminUserData.name,
                          role: "Admin",
                          phone: adminUserData.phone || "",
                        },
                      });
                      setRole("Admin");
                      setSession({
                        user: {
                          id: adminUserData.id,
                          email: adminUserData.email,
                          user_metadata: {
                            name: adminUserData.name,
                            role: "Admin",
                            phone: adminUserData.phone || "",
                          },
                        },
                        access_token: "admin_maintained_during_creation",
                      });
                    }
                  } catch (parseError) {
                    console.warn(
                      "Error parsing admin user during creation:",
                      parseError,
                    );
                  }
                }
              }
            } catch (error) {
              console.warn(
                "[AuthContext] Error checking session on visibility change:",
                error,
              );
            }
          }
        }, 500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      try {
        // Properly cleanup auth listener to prevent socket errors
        if (listener?.subscription) {
          listener.subscription.unsubscribe();
        }
      } catch (error) {
        console.warn("[AuthContext] Error unsubscribing auth listener:", error);
      }

      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current);
      }
    };
  }, [initializeSession, isHydrated, user?.id]);

  // Handle force session restore events from other components with throttling
  useEffect(() => {
    let lastForceRestoreTime = 0;
    const FORCE_RESTORE_THROTTLE = 2000; // 2 second throttle

    const handleForceSessionRestore = async (event: CustomEvent) => {
      const now = Date.now();
      if (now - lastForceRestoreTime < FORCE_RESTORE_THROTTLE) {
      {/*  console.log("[AuthContext] Force session restore throttled");*/}
        return;
      }
      lastForceRestoreTime = now;

     {/* console.log(
        "[AuthContext] Force session restore event received:",
        event.detail,
      );*/}
      const userData = event.detail;

      if (
        userData &&
        userData.id &&
        userData.email &&
        !initializationRef.current &&
        isHydrated
      ) {
        console.log("[AuthContext] Processing force session restore...");
        await initializeSession();
      }
    };

    window.addEventListener(
      "forceSessionRestore",
      handleForceSessionRestore as EventListener,
    );

    return () => {
      window.removeEventListener(
        "forceSessionRestore",
        handleForceSessionRestore as EventListener,
      );
    };
  }, [initializeSession, isHydrated]);

  const value: AuthContextType = {
    isAuthenticated: !!session && !!user,
    userRole: role,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    userName: user?.user_metadata?.name ?? null,
    userPhone: user?.user_metadata?.phone ?? null,
    isAdmin:
      role === "Admin" ||
      role === "Super Admin" ||
      user?.email?.includes("admin") ||
      user?.email === "divatranssoetta@gmail.com",
    isLoading,
    isHydrated,
    isCheckingSession,
    isSessionReady,
    signOut,
    forceRefreshSession,
    ensureSessionReady,
  };

  // Set context ready after first render to prevent null context issues
  useEffect(() => {
    setContextReady(true);
  }, []);

  // Don't render children until context is ready to prevent null context errors
  if (!contextReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  // Enhanced error handling for null context
  if (context === null || context === undefined) {
    console.warn(
      "useAuth called with null/undefined context, providing fallback context",
    );
    return {
      isAuthenticated: false,
      userRole: null,
      userId: null,
      userEmail: null,
      userName: null,
      userPhone: null,
      isAdmin: false,
      isLoading: false,
      isHydrated: true,
      isCheckingSession: false,
      isSessionReady: true,
      signOut: async () => {
        console.warn("signOut called from fallback context");
      },
      forceRefreshSession: async () => {
        console.warn("forceRefreshSession called from fallback context");
      },
      ensureSessionReady: async () => {
        console.warn("ensureSessionReady called from fallback context");
      },
    };
  }

  // Additional safety check for context properties
  if (typeof context !== "object") {
    console.warn(
      "useAuth context is not an object, providing fallback context",
    );
    return {
      isAuthenticated: false,
      userRole: null,
      userId: null,
      userEmail: null,
      userName: null,
      userPhone: null,
      isAdmin: false,
      isLoading: false,
      isHydrated: true,
      isCheckingSession: false,
      isSessionReady: true,
      signOut: async () => {
        console.warn("signOut called from fallback context");
      },
      forceRefreshSession: async () => {
        console.warn("forceRefreshSession called from fallback context");
      },
      ensureSessionReady: async () => {
        console.warn("ensureSessionReady called from fallback context");
      },
    };
  }

  return context;
};