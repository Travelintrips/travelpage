import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, UserPlus, Shield, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface User {
  id: string;
  email: string;
  full_name: string;
  role_id: number;
  role: { role_name: string };
  phone_number?: string;
  staff?: {
    phone?: string;
    reference_phone?: string;
    selfie_url?: string;
    ktp_url?: string;
    sim_url?: string;
    ethnicity?: string;
    religion?: string;
  };
}

interface Role {
  role_id: number;
  role_name: string;
}

export default function StaffManagement() {
  const { userRole, isAuthenticated, isSessionReady, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  
  // FIXED: Better loading state initialization
  const [isLoading, setIsLoading] = useState(false);
  
  // Add ref to track if fetch is in progress and prevent duplicates
  const [isFetching, setIsFetching] = useState(false);
  const fetchInProgress = useRef(false);
  const lastFetchTime = useRef(0);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [emailToPromote, setEmailToPromote] = useState("");
  const [isStaffTripsDialogOpen, setIsStaffTripsDialogOpen] = useState(false);
  const [emailToStaffTrips, setEmailToStaffTrips] = useState("diva@gmail.com");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginatedUsers, setPaginatedUsers] = useState<User[]>([]);

  // Helper function to get image URL from Supabase Storage
  const getImageUrl = (
    path: string | null | undefined,
    bucket: string = "selfies",
  ): string | null => {
    if (!path) return null;

    try {
      // If the path is already a full URL, return it directly
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
      }

      // Clean the path - remove any leading slashes or bucket names
      let cleanPath = path.trim();
      if (cleanPath.startsWith("/")) {
        cleanPath = cleanPath.substring(1);
      }
      if (cleanPath.startsWith(`${bucket}/`)) {
        cleanPath = cleanPath.substring(`${bucket}/`.length);
      }

      // Generate public URL from Supabase Storage
      const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
      return data.publicUrl;
    } catch (error) {
      return null;
    }
  };

  // Filter states - removed ethnicity and religion filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const { toast } = useToast();

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number | null>(null);

  // FIXED: Fetch data when auth is ready and authenticated
  useEffect(() => {
    if (isAuthenticated && isSessionReady && !authLoading) {
      console.log('[StaffManagement] Auth ready, checking for cached data...');
      
      // Always fetch roles when component mounts or becomes active
      fetchRoles();
      
      // Only fetch users if we don't have data yet
      if (users.length === 0) {
        // ✅ Load cached data first untuk mencegah loading screen
        const cachedData = sessionStorage.getItem('staffManagement_cachedData');
        if (cachedData) {
          try {
            const parsedData = JSON.parse(cachedData);
            if (parsedData && parsedData.length > 0) {
              setUsers(parsedData);
              setFilteredUsers(parsedData);
              console.log('[StaffManagement] Loaded cached data, NO LOADING SCREEN');
              
              // Background refresh to get latest data
              setTimeout(() => fetchUsers(true), 100);
              return;
            }
          } catch (error) {
            console.warn('[StaffManagement] Failed to parse cached data:', error);
          }
        }

        // Fetch data if no cache or cache is empty
        console.log('[StaffManagement] No cached data, fetching fresh data...');
        fetchUsers();
      }
    }
  }, [isAuthenticated, isSessionReady, authLoading]);

  // FIXED: Add visibility change handler to refetch data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && isSessionReady && !authLoading) {
        console.log('[StaffManagement] Tab became visible, refreshing roles and users...');
        
        // Always refresh roles when tab becomes visible
        fetchRoles();
        
        const now = Date.now();
        // Only refetch users if more than 30 seconds have passed since last fetch
        if (now - lastFetchTime.current > 30000 && !fetchInProgress.current) {
          console.log('[StaffManagement] Doing background user refresh...');
          fetchUsers(true); // Background refresh without loading spinner
        } else {
          console.log('[StaffManagement] Skipping user refresh - too recent or already fetching');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isSessionReady, authLoading]);

  // Filter effect - removed ethnicity and religion filters
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.staff?.phone?.includes(searchTerm) ||
          user.staff?.reference_phone?.includes(searchTerm),
      );
    }

    // Role filter
    if (roleFilter && roleFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.role_id.toString() === roleFilter,
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [users, searchTerm, roleFilter]);

  // Pagination effect
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setPaginatedUsers(filteredUsers.slice(startIndex, endIndex));
  }, [filteredUsers, currentPage, pageSize]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, filteredUsers.length);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1); // Reset to first page when page size changes
  };

  // FIXED: Modified fetchUsers with proper loading state management
  const fetchUsers = async (isBackgroundRefresh = false) => {
    // Don't fetch if not authenticated or already fetching
    if (!isAuthenticated || !isSessionReady || authLoading) {
      console.log('[StaffManagement] Skipping fetch - auth not ready');
      return;
    }

    // Prevent duplicate fetches
    if (fetchInProgress.current) {
    //  console.log('[StaffManagement] Fetch already in progress, skipping...');
      return;
    }

    fetchInProgress.current = true;
    lastFetchTime.current = Date.now();
    setIsFetching(true);

    try {
      // Only show loading spinner for initial load when no data exists
      if (!isBackgroundRefresh && users.length === 0) {
      //  console.log('[StaffManagement] Showing loading spinner for initial load');
        setIsLoading(true);
      } else {
     //   console.log('[StaffManagement] Background refresh, no loading spinner');
      }

      console.log("[StaffManagement] Starting to fetch users...");

      // Get roles data first for filtering and mapping
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("role_id, role_name");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        throw new Error("Failed to fetch roles data");
      }

      console.log("[StaffManagement] Roles data:", rolesData);

      // Define allowed roles based on user role
      const excludedRoleNames = ["Dispatcher", "Pengawas"];
      let allowedRoleNames: string[] = [];
      let allowedRoleIds: number[] = [];

      if (userRole === "Super Admin") {
        allowedRoleNames = ["Staff", "Staff Trips", "Staff Admin", "Staff Traffic", "Staff Admin Sport Center"];
      } else {
        allowedRoleNames = ["Staff", "Staff Trips", "Staff Admin", "Staff Traffic", "Staff Admin Sport Center"];
      }

      // Filter out excluded roles
      allowedRoleNames = allowedRoleNames.filter(name => !excludedRoleNames.includes(name));

      // Get role IDs for the allowed roles
      allowedRoleIds = rolesData
        ?.filter(role => allowedRoleNames.includes(role.role_name))
        ?.map(role => role.role_id) || [];

    //  console.log("[StaffManagement] Allowed roles for", userRole, ":", allowedRoleNames);

      let transformedUsers = [];

      // Fetch from users table first
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select(
          `
          id,
          email,
          full_name,
          role_id,
          phone_number,
          selfie_url,
          ktp_url,
          sim_url,
          ethnicity,
          religion,
          role
        `
        )
        .in("role_id", allowedRoleIds);

     // console.log("[StaffManagement] Users query result:", { usersData, usersError });

      if (!usersError && usersData && usersData.length > 0) {
        // Transform users data
        const usersTransformed = usersData
          .map((user) => {
            const role = rolesData?.find((r) => r.role_id === user.role_id);
            return {
              ...user,
              role: role ? { role_name: role.role_name } : { role_name: "Unknown" },
              staff: {
                phone: user.phone_number,
                reference_phone: null,
                selfie_url: user.selfie_url,
                ktp_url: user.ktp_url,
                sim_url: user.sim_url,
                ethnicity: user.ethnicity,
                religion: user.religion,
              },
            };
          })
          .filter((user) => {
            const roleName = user.role?.role_name;
            return roleName && allowedRoleNames.includes(roleName) && !excludedRoleNames.includes(roleName);
          });

        transformedUsers = [...transformedUsers, ...usersTransformed];
      //  console.log("[StaffManagement] Transformed users from users table:", usersTransformed.length);
      }

      // Fetch from staff table
      const { data: staffData, error: staffError } = await supabase
        .from("staff")
        .select(
          `
          id,
          email,
          full_name,
          name,
          role_id,
          phone,
          family_phone_number,
          selfie_url,
          ktp_url,
          ethnicity,
          religion,
          user_id,
          role
        `
        );

    //  console.log("[StaffManagement] Staff query result:", { staffData, staffError });

      if (!staffError && staffData && staffData.length > 0) {
        // Transform staff data to match expected format
        const staffTransformed = staffData
          .filter((staff) => {
            // Filter by role_id if available, otherwise by role string
            if (staff.role_id) {
              const role = rolesData?.find((r) => r.role_id === staff.role_id);
              const roleName = role?.role_name;
              return allowedRoleIds.includes(staff.role_id) && (!roleName || !excludedRoleNames.includes(roleName));
            } else if (staff.role) {
              return allowedRoleNames.includes(staff.role) && !excludedRoleNames.includes(staff.role);
            }
            return false;
          })
          .map((staff) => {
            const role = rolesData?.find((r) => r.role_id === staff.role_id);
            return {
              id: staff.user_id || staff.id,
              email: staff.email,
              full_name: staff.full_name || staff.name,
              role_id: staff.role_id,
              phone_number: staff.phone,
              role: role ? { role_name: role.role_name } : { role_name: staff.role || "Unknown" },
              staff: {
                phone: staff.phone,
                reference_phone: staff.family_phone_number,
                selfie_url: staff.selfie_url,
                ktp_url: staff.ktp_url,
                sim_url: null,
                ethnicity: staff.ethnicity,
                religion: staff.religion,
              },
            };
          });

        // Merge staff data, avoiding duplicates based on email
        const existingEmails = new Set(transformedUsers.map(u => u.email));
        const uniqueStaffData = staffTransformed.filter(staff => !existingEmails.has(staff.email));
        transformedUsers = [...transformedUsers, ...uniqueStaffData];
        
        console.log("[StaffManagement] Transformed staff from staff table:", uniqueStaffData.length);
      }

    //  console.log("[StaffManagement] Final combined users data:", transformedUsers.length);
    //  console.log("[StaffManagement] Sample user data:", transformedUsers[0]);
      setUsers(transformedUsers);
      setFilteredUsers(transformedUsers);
      
      // Cache the data for future use
      sessionStorage.setItem('staffManagement_cachedData', JSON.stringify(transformedUsers));
      
    //  console.log('[StaffManagement] Staff data fetch completed successfully');
    //  console.log('[StaffManagement] Users state will be set to:', transformedUsers.length, 'users');
    //  console.log('[StaffManagement] FilteredUsers state will be set to:', transformedUsers.length, 'users');
    } catch (error) {
      console.error("[StaffManagement] Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: error.message || "Failed to fetch staff data",
      });
      
      // Don't reset data to empty on error, just log the error
      console.warn("[StaffManagement] Keeping existing data due to fetch error");
    } finally {
      // CRITICAL: Always reset loading states
      setIsLoading(false);
      setIsFetching(false);
      fetchInProgress.current = false;
    }
  };

  const fetchRoles = async () => {
    try {
      console.log('[StaffManagement] Fetching roles...');
      const { data, error } = await supabase
        .from("roles")
        .select("role_id, role_name");

      if (error) throw error;
      
      console.log('[StaffManagement] Roles fetched successfully:', data?.length || 0, 'roles');
      setRoles(data || []);
      
      // Cache roles data
      if (data && data.length > 0) {
        sessionStorage.setItem('staffManagement_rolesCache', JSON.stringify(data));
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      
      // Try to load from cache if fetch fails
      const cachedRoles = sessionStorage.getItem('staffManagement_rolesCache');
      if (cachedRoles) {
        try {
          const parsedRoles = JSON.parse(cachedRoles);
          console.log('[StaffManagement] Using cached roles due to fetch error');
          setRoles(parsedRoles);
          return;
        } catch (parseError) {
          console.warn('[StaffManagement] Failed to parse cached roles:', parseError);
        }
      }
      
      toast({
        variant: "destructive",
        title: "Error fetching roles",
        description: error.message,
      });
    }
  };

  const handleOpenDialog = (user?: User) => {
    // Always fetch fresh roles when opening dialog to ensure options are available
    fetchRoles();
    
    if (user) {
      setIsEditMode(true);
      setCurrentUser(user);
      setEmail(user.email);
      setFullName(user.full_name);
      setRoleId(user.role_id);
    } else {
      setIsEditMode(false);
      setCurrentUser({});
      setEmail("");
      setFullName("");
      setPassword("");
      setRoleId(null);
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate that a role is selected
      if (!roleId) {
        toast({
          variant: "destructive",
          title: "Role Required",
          description: "Please select a role for the staff member.",
        });
        return;
      }

      // Get the selected role details
      const { data: selectedRole, error: roleError } = await supabase
        .from("roles")
        .select("role_id, role_name")
        .eq("role_id", roleId)
        .single();

      if (roleError || !selectedRole) {
        console.error("Error fetching selected role:", roleError);
        toast({
          variant: "destructive",
          title: "Error fetching role",
          description:
            "Please make sure the selected role exists in the database.",
        });
        return;
      }

      if (isEditMode) {
        // Get the selected role name
        const selectedRoleObj = roles.find(
          (role) => role.role_id === roleId,
        );
        const role = selectedRoleObj?.role_name || "Staff";

        // Use the modified edge function to update both users and staff tables
        const { data: updateData, error: updateError } =
          await supabase.functions.invoke(
            "supabase-functions-create-staff-user",
            {
              body: {
                userId: currentUser.id,
                email: email,
                fullName: fullName,
                roleId: roleId,
                roleName: selectedRole.role_name,
                isUpdate: true,
                // Include other fields that might be needed
                address: null,
                ktpNumber: null,
                department:
                  role === "Staff"
                    ? "General"
                    : role.replace("Staff ", ""),
                position: null,
                employeeId: null, // Keep existing employee ID
                idCardImage: null,
                religion: null,
                ethnicity: null,
                firstName: fullName.split(" ")[0] || null,
                lastName: fullName.split(" ").slice(1).join(" ") || null,
              },
            },
          );

        if (updateError) {
          console.error("Error updating staff:", updateError);
          toast({
            variant: "destructive",
            title: "Update failed",
            description: updateError.message || "Failed to update staff member",
          });
          return;
        }

        console.log("Staff updated successfully:", updateData);

        toast({
          title: "Staff updated",
          description: "Staff member has been updated successfully",
        });

        setIsOpen(false);
      } else {
        // ✅ Creating new staff member
        // Store current admin session before creating new user
        const { data: currentSession } = await supabase.auth.getSession();
        const currentAdminUser = currentSession?.session?.user;

        console.log(
          "🔐 Creating staff account - Current admin:",
          currentAdminUser?.email,
        );

        // Store admin data in localStorage BEFORE creating new user
        if (currentAdminUser) {
          const adminUserData = {
            id: currentAdminUser.id,
            email: currentAdminUser.email,
            name:
              currentAdminUser.user_metadata?.name ||
              currentAdminUser.email?.split("@")[0] ||
              "Admin",
            role: "Admin",
            phone: currentAdminUser.user_metadata?.phone || "",
          };

          localStorage.setItem("auth_user", JSON.stringify(adminUserData));
          localStorage.setItem("userId", currentAdminUser.id);
          localStorage.setItem("userEmail", currentAdminUser.email || "");
          localStorage.setItem("userName", adminUserData.name);
          localStorage.setItem("userRole", "Admin");
          localStorage.setItem("isAdmin", "true");

          // CRITICAL: Set flags to prevent auth context from switching sessions
          // These flags MUST be set before creating the user
          sessionStorage.setItem("adminCreatingUser", "true");
          sessionStorage.setItem("currentAdminId", currentAdminUser.id);
          sessionStorage.setItem(
            "currentAdminEmail",
            currentAdminUser.email || "",
          );

          console.log("💾 Admin data stored before creating staff user");
          console.log("🚩 Session flags set:", {
            adminCreatingUser: sessionStorage.getItem("adminCreatingUser"),
            currentAdminId: sessionStorage.getItem("currentAdminId"),
            currentAdminEmail: sessionStorage.getItem("currentAdminEmail"),
          });
        } else {
          console.error("❌ No current admin user found!");
          toast({
            variant: "destructive",
            title: "Error",
            description:
              "No admin session found. Please refresh and try again.",
          });
          return;
        }

        // CRITICAL: Use admin service role to create user without affecting current session
        // Set multiple flags to completely block any auth state changes during creation
        sessionStorage.setItem("blockAuthStateChanges", "true");
        sessionStorage.setItem("preventAutoLogin", "true");
        sessionStorage.setItem("staffCreationInProgress", "true");

        // Store current admin session data before creation
        const currentSessionData = {
          id: currentAdminUser.id,
          email: currentAdminUser.email,
          role: "Admin",
          name:
            currentAdminUser.user_metadata?.name ||
            currentAdminUser.email?.split("@")[0] ||
            "Admin",
        };
        sessionStorage.setItem(
          "preservedAdminSession",
          JSON.stringify(currentSessionData),
        );

        console.log("🚀 Calling edge function to create staff user...");
        const { data: authData, error: authError } =
          await supabase.functions.invoke(
            "supabase-functions-create-staff-user",
            {
              body: {
                email,
                password,
                fullName,
                roleId,
                roleName: selectedRole.role_name,
                adminUserId: currentAdminUser.id,
                phone: "", // Add phone field
                address: "", // Add address field
                familyphoneNumber: "", // Add referencePhone field
                ktpNumber: "", // Add ktpNumber field

                licenseExpiry: "", // Add licenseExpiry field
                department: "", // Add department field
                position: "", // Add position field
                employeeId: "", // Add employeeId field
                religion: "", // Add religion field
                ethnicity: "", // Add ethnicity field
                firstName: "", // Add firstName field
                lastName: "", // Add lastName field
                ktpImage: "", // Add ktpImage field
                simImage: "", // Add simImage field
                kkImage: "", // Add kkImage field
                skckImage: "", // Add skckImage field
              },
            },
          );

        if (authError) {
          console.error(
            "❌ Edge function failed to create staff user:",
            authError,
          );
          // Clear flags on error
          sessionStorage.removeItem("adminCreatingUser");
          sessionStorage.removeItem("currentAdminId");
          sessionStorage.removeItem("currentAdminEmail");
          sessionStorage.removeItem("blockAuthStateChanges");
          sessionStorage.removeItem("preventAutoLogin");
          sessionStorage.removeItem("staffCreationInProgress");
          sessionStorage.removeItem("preservedAdminSession");
          throw authError;
        }

        console.log(
          "✅ Staff user created via edge function:",
          authData?.user?.email,
        );

        if (authData?.user) {
          // Edge function should have handled all database operations
          console.log(
            "✅ Staff user and database records created via edge function",
          );

          // Verify the user was created properly
          const { data: verifyUser, error: verifyError } = await supabase
            .from("users")
            .select("role_id, full_name, role:roles(role_name)")
            .eq("id", authData.user.id)
            .single();

          if (verifyError) {
            console.warn("⚠️ Could not verify user creation:", verifyError);
          } else {
            console.log("✅ User verification:", verifyUser);
          }

          // Staff record should have been created by the edge function
          console.log("✅ Staff record created via edge function");

          toast({
            title: "Staff created",
            description: `Staff member has been created successfully with role: ${selectedRole.role_name}`,
          });

          console.log("✅ Staff created successfully via edge function");

          // Clear admin creation flags after successful creation
          setTimeout(() => {
            sessionStorage.removeItem("adminCreatingUser");
            sessionStorage.removeItem("currentAdminId");
            sessionStorage.removeItem("currentAdminEmail");
            sessionStorage.removeItem("blockAuthStateChanges");
            sessionStorage.removeItem("preventAutoLogin");
            sessionStorage.removeItem("staffCreationInProgress");
            sessionStorage.removeItem("preservedAdminSession");
            console.log("🧹 Admin creation flags cleared");
          }, 3000);
        }
      }

      // Reset form fields
      setEmail("");
      setFullName("");
      setPassword("");
      setRoleId(null);

      setIsOpen(false);

      // Add delay before fetching to ensure database is updated
      setTimeout(() => {
        fetchUsers();
      }, 1000);
    } catch (error) {
      console.error("Error saving user:", error);
      // Clear flags on any error
      sessionStorage.removeItem("adminCreatingUser");
      sessionStorage.removeItem("currentAdminId");
      sessionStorage.removeItem("currentAdminEmail");
      sessionStorage.removeItem("blockAuthStateChanges");
      sessionStorage.removeItem("preventAutoLogin");
      sessionStorage.removeItem("staffCreationInProgress");
      sessionStorage.removeItem("preservedAdminSession");

      toast({
        variant: "destructive",
        title: "Error saving user",
        description: error.message || "An error occurred while saving the user",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userRole !== "Super Admin") {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Only Super Admin can delete staff members",
      });
      return;
    }

    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
      // Delete from auth.users (requires admin privileges)
      const { error: authError } = await supabase.functions.invoke(
        "delete-user",
        {
          body: { userId },
        },
      );

      if (authError) throw authError;

      // Delete from public.users
      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (userError) throw userError;

      toast({
        title: "Staff deleted",
        description: "Staff member has been deleted successfully",
      });

      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error deleting user",
        description: error.message,
      });
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!emailToPromote) {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter an email address",
      });
      return;
    }

    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .ilike("email", emailToPromote)
        .maybeSingle();

      if (userError) {
        throw new Error(`User not found: ${userError.message}`);
      }

      if (!userData) {
        throw new Error("User not found with that email");
      }

      // Get the Admin role ID
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("role_id")
        .eq("role_name", "Admin")
        .single();

      if (roleError) {
        throw new Error(`Admin role not found: ${roleError.message}`);
      }

      // Update the user's role in the users table
      const { error: updateError } = await supabase
        .from("users")
        .update({
          role_id: roleData.role_id,
          role: "Admin",
          role_name: "Admin",
        })
        .eq("id", userData.id);

      if (updateError) {
        throw updateError;
      }

      // Update role using edge function
      const { error: roleAssignError } = await supabase.functions.invoke(
        "supabase-functions-assignRole",
        {
          body: {
            userId: userData.id,
            roleId: roleData.role_id,
          },
        },
      );

      if (roleAssignError) {
        throw roleAssignError;
      }

      toast({
        title: "Role updated",
        description: `${emailToPromote} has been promoted to Admin`,
      });

      setEmailToPromote("");
      setIsPromoteDialogOpen(false);
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error("Error promoting user to Admin:", error);
      toast({
        variant: "destructive",
        title: "Error promoting user",
        description: error.message,
      });
    }
  };

  const handleAssignStaffTripsRole = async () => {
    // Always proceed with the pre-filled email
    console.log("Assigning Staff Trips role to:", emailToStaffTrips);
    if (!emailToStaffTrips || emailToStaffTrips.trim() === "") {
      toast({
        variant: "destructive",
        title: "Email required",
        description: "Please enter an email address",
      });
      return;
    }

    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id")
        .ilike("email", emailToStaffTrips)
        .maybeSingle();

      if (userError) {
        throw new Error(`User not found: ${userError.message}`);
      }

      if (!userData) {
        throw new Error("User not found with that email");
      }

      // Get the Staff Trips role ID
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("role_id")
        .eq("role_name", "Staff Trips")
        .single();

      if (roleError) {
        throw new Error(`Staff Trips role not found: ${roleError.message}`);
      }

      // Update the user's role in the users table
      const { error: updateError } = await supabase
        .from("users")
        .update({
          role_id: roleData.role_id,
          role: "Staff Trips",
          role_name: "Staff Trips",
        })
        .eq("id", userData.id);

      if (updateError) {
        throw updateError;
      }

      // Update role using edge function
      const { error: roleAssignError } = await supabase.functions.invoke(
        "supabase-functions-assignRole",
        {
          body: {
            userId: userData.id,
            roleId: roleData.role_id,
          },
        },
      );

      if (roleAssignError) {
        throw roleAssignError;
      }

      toast({
        title: "Role updated",
        description: `${emailToStaffTrips} has been assigned the Staff Trips role`,
      });

      setEmailToStaffTrips("");
      setIsStaffTripsDialogOpen(false);
      fetchUsers(); // Refresh the user list
    } catch (error) {
      console.error("Error assigning Staff Trips role:", error);
      toast({
        variant: "destructive",
        title: "Error assigning role",
        description: error.message,
      });
    }
  };

  useEffect(() => {
    return () => {
      // ✅ Reset visited flag ketika navigate away dari StaffManagement
      // Ini memungkinkan loading spinner muncul ketika navigate ke menu lain lalu kembali
      sessionStorage.removeItem('staffManagement_visited');
    };
  }, []);

 /* console.log('[StaffManagement] Render - Current state:', {
    isLoading,
    usersLength: users.length,
    filteredUsersLength: filteredUsers.length,
    isAuthenticated,
    isSessionReady,
    authLoading
  });*/

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Staff Management</h2>
        <div className="flex gap-2">
          {userRole?.trim().toLowerCase() !== "staff" && (
            <>
              <Button
                onClick={() => setIsPromoteDialogOpen(true)}
                variant="outline"
                className="bg-amber-100 hover:bg-amber-200 border-amber-300"
              >
                <Shield className="mr-2 h-4 w-4" /> Promote to Admin
              </Button>
              <Button
                onClick={() => setIsStaffTripsDialogOpen(true)}
                variant="outline"
                className="bg-blue-100 hover:bg-blue-200 border-blue-300"
              >
                <Shield className="mr-2 h-4 w-4" /> Assign Staff Trips Role
              </Button>
              <Button
                onClick={() => handleOpenDialog()}
                className="bg-primary-tosca hover:bg-primary-tosca/90"
              >
                <UserPlus className="mr-2 h-4 w-4" /> Add Staff
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <h3 className="text-lg font-semibold">Filter Staff</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={roleFilter || undefined}
            onValueChange={(value) => setRoleFilter(value || "")}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles
                .filter((role) => {
                  const excludedRoles = ["dispatcher", "pengawas"];
                  const allowedRoles = [
                    "staff",
                    "staff trips",
                    "staff admin",
                    "staff traffic",
                    "staff admin sport center",
                  ];

                  const roleName = role.role_name.toLowerCase().trim();
                  return allowedRoles.includes(roleName) && !excludedRoles.includes(roleName);
                })
                .map((role) => (
                  <SelectItem key={role.role_id} value={role.role_id.toString()}>
                    {role.role_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        {(searchTerm || roleFilter) && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchTerm && (
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setSearchTerm("")}
              >
                Search: {searchTerm} ×
              </Badge>
            )}
            {roleFilter && roleFilter !== "all" && (
              <Badge
                variant="secondary"
                className="cursor-pointer"
                onClick={() => setRoleFilter("")}
              >
                Role:{" "}
                {
                  roles.find((r) => r.role_id.toString() === roleFilter)
                    ?.role_name
                }{" "}
                ×
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("");
              }}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Page Size Selector */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show:</span>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">entries per page</span>
        </div>
        <div className="text-sm text-gray-600">
          Showing {filteredUsers.length > 0 ? startIndex : 0} to {endIndex} of {filteredUsers.length} entries
        </div>
      </div>

      {/* FIXED: Better loading and empty state handling */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading staff members...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">No staff members found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>
              {filteredUsers.length} of {users.length} staff members shown
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-gray-500"
                  >
                    No staff members match the current filters
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={
                            getImageUrl(user.staff?.selfie_url, "selfies") ||
                            undefined
                          }
                          alt={user.full_name || "Staff"}
                          className="object-cover"
                          onError={(e) => {
                            console.log(
                              "Image failed to load:",
                              e.currentTarget.src,
                            );
                            console.log("Original path:", user.staff?.selfie_url);
                          }}
                          onLoad={(e) => {
                            console.log(
                              "Image loaded successfully:",
                              e.currentTarget.src,
                            );
                          }}
                        />
                        <AvatarFallback className="bg-gray-200 text-gray-600">
                          {user.full_name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase() || "S"}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.full_name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.staff?.phone || user.phone_number || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {user.role?.role_name || "No Role"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {user.staff?.ktp_url && (
                          <a
                            href={
                              getImageUrl(user.staff.ktp_url, "documents") || "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80"
                          >
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-blue-200 bg-blue-100 text-blue-800"
                            >
                              KTP
                            </Badge>
                          </a>
                        )}
                        {user.staff?.sim_url && (
                          <a
                            href={
                              getImageUrl(user.staff.sim_url, "documents") || "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-80"
                          >
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-pointer hover:bg-green-200 bg-green-100 text-green-800"
                            >
                              SIM
                            </Badge>
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {userRole?.trim().toLowerCase() !== "staff" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {userRole?.trim().toLowerCase() === "super admin" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination Controls */}
      {filteredUsers.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Staff" : "Add New Staff"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update staff details below."
                : "Fill in the details to create a new staff member."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="col-span-3"
                  disabled={isEditMode}
                  required
                  placeholder="staff@example.com"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fullName" className="text-right">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="col-span-3"
                  required
                  placeholder="John Doe"
                />
              </div>
              {!isEditMode && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="col-span-3"
                    required={!isEditMode}
                    placeholder="••••••••"
                    minLength={8}
                  />
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                  Role <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={roleId?.toString() || ""}
                  onValueChange={(value) => setRoleId(parseInt(value))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter((role) => {
                        const excludedRoles = ["Dispatcher", "Pengawas"];
                        if (userRole === "Super Admin") {
                          return [
                            "Staff",
                            "Staff Trips",
                            "Staff Admin",
                            "Staff Traffic",
                            "Staff Admin Sport Center",
                          ].includes(role.role_name) && !excludedRoles.includes(role.role_name);
                        } else {
                          return [
                            "Staff",
                            "Staff Trips",
                            "Staff Admin",
                            "Staff Traffic",
                            "Staff Admin Sport Center",
                          ].includes(role.role_name) && !excludedRoles.includes(role.role_name);
                        }
                      })
                      .map((role) => (
                        <SelectItem
                          key={role.role_id}
                          value={role.role_id.toString()}
                        >
                          {role.role_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="mr-2"
              >
                Cancel
              </Button>
              <Button type="submit">{isEditMode ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Promote to Admin Dialog */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Promote User to Admin</DialogTitle>
            <DialogDescription>
              Enter the email address of the user you want to promote to Admin
              role.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emailToPromote" className="text-right">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emailToPromote"
                type="email"
                value={emailToPromote}
                onChange={(e) => setEmailToPromote(e.target.value)}
                className="col-span-3"
                required
                placeholder="user@example.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPromoteDialogOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePromoteToAdmin}
              className="bg-amber-500 hover:bg-amber-600"
            >
              Promote to Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Staff Trips Role Dialog */}
      <Dialog
        open={isStaffTripsDialogOpen}
        onOpenChange={setIsStaffTripsDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Staff Trips Role</DialogTitle>
            <DialogDescription>
              Enter the email address of the user you want to assign the Staff
              Trips role.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="emailToStaffTrips" className="text-right">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="emailToStaffTrips"
                type="email"
                value={emailToStaffTrips}
                onChange={(e) => setEmailToStaffTrips(e.target.value)}
                className="col-span-3"
                required
                placeholder="divatran@gmail.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsStaffTripsDialogOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAssignStaffTripsRole}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Assign Staff Trips Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}