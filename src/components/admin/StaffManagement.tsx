import React, { useState, useEffect } from "react";
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
import { Pencil, Trash2, UserPlus } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
  role_id: number;
  role: { role_name: string };
}

interface Role {
  role_id: number;
  role_name: string;
}

export default function StaffManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const { toast } = useToast();

  // Form state
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select(
          `
        id,
        email,
        full_name,
        role_id,
        role:roles(role_name)
      `,
        )
        .not("role_id", "is", null) // Only get users with role_id
        .neq("role_id", 1); // Exclude Admin role (assuming role_id 1 is Admin)

      if (error) {
        console.error("Error fetching users:", error.message);
        throw new Error("Failed to fetch staff users");
      }

      console.log("Fetched users:", data);
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("roles")
        .select("role_id, role_name");

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast({
        variant: "destructive",
        title: "Error fetching roles",
        description: error.message,
      });
    }
  };

  const handleOpenDialog = (user?: User) => {
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
        // ✅ 1. Update full_name via Supabase client
        const { error: updateNameError } = await supabase
          .from("users")
          .update({ full_name: fullName })
          .eq("id", currentUser.id);

        if (updateNameError) throw updateNameError;

        // ✅ 2. Update role via Edge Function
        const { data: edgeData, error: edgeError } =
          await supabase.functions.invoke(
            "supabase-functions-create-staff-user",
            {
              body: {
                userId: currentUser.id,
                email: currentUser.email,
                fullName: fullName,
                roleId: roleId,
                roleName: selectedRole.role_name,
                isUpdate: true,
                // Don't pass empty values - let the edge function preserve existing data
              },
            },
          );

        if (edgeError) throw edgeError;

        toast({
          title: "Staff updated",
          description: "Staff member has been updated successfully",
        });
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

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Staff Management</h2>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-primary-tosca hover:bg-primary-tosca/90"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Add Staff
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading staff members...</p>
        </div>
      ) : (
        <Table>
          <TableCaption>List of all staff members in the system</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.full_name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role?.role_name || "No Role"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
                    {roles.map((role) => (
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
    </div>
  );
}
