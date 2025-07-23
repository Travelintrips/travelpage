import React, { useState } from "react";
import UserManagement from "./UserManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import RegistrationForm from "@/components/auth/RegistrationForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

const StaffPage = () => {
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleOpenRegistrationForm = () => {
    setShowRegistrationDialog(true);
  };

  const handleRegister = async (data) => {
    setIsSubmitting(true);
    try {
      console.log("Starting staff registration process");

      // Get the role_id for the selected role
      console.log(`Fetching role_id for role: ${data.role}`);
      const { data: roleData, error: roleError } = await supabase
        .from("roles")
        .select("role_id")
        .eq("role_name", data.role)
        .single();

      if (roleError) {
        console.error("Role fetch error:", roleError);
        throw new Error(
          `Error fetching ${data.role} role: ${roleError.message}`,
        );
      }

      console.log(`Role ID found: ${roleData.role_id}`);

      // Check if user already exists
      console.log(`Checking if user with email ${data.email} already exists`);
      const { data: existingUser, error: existingUserError } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", data.email)
        .maybeSingle();

      if (existingUser) {
        console.error("User already exists:", existingUser);
        throw new Error(`User with email ${data.email} already exists`);
      }

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
          role: "Staff Admin",
          phone: currentAdminUser.user_metadata?.phone || "",
        };

        localStorage.setItem("auth_user", JSON.stringify(adminUserData));
        localStorage.setItem("userId", currentAdminUser.id);
        localStorage.setItem("userEmail", currentAdminUser.email || "");
        localStorage.setItem("userName", adminUserData.name);
        localStorage.setItem("userRole", "Staff Admin");
        localStorage.setItem("isAdmin", "false");

        // CRITICAL: Set flags to prevent auth context from switching sessions
        sessionStorage.setItem("adminCreatingUser", "true");
        sessionStorage.setItem("currentAdminId", currentAdminUser.id);
        sessionStorage.setItem(
          "currentAdminEmail",
          currentAdminUser.email || "",
        );
        sessionStorage.setItem("blockAuthStateChanges", "true");
        sessionStorage.setItem("preventAutoLogin", "true");
        sessionStorage.setItem("staffCreationInProgress", "true");

        // Store current admin session data before creation
        const currentSessionData = {
          id: currentAdminUser.id,
          email: currentAdminUser.email,
          role: "Staff Admin",
          name:
            currentAdminUser.user_metadata?.name ||
            currentAdminUser.email?.split("@")[0] ||
            "Admin",
        };
        sessionStorage.setItem(
          "preservedAdminSession",
          JSON.stringify(currentSessionData),
        );

        console.log("💾 Admin data stored before creating staff user");
      } else {
        console.error("❌ No current admin user found!");
        toast({
          variant: "destructive",
          title: "Error",
          description: "No admin session found. Please refresh and try again.",
        });
        return;
      }

      // Use edge function to create staff user without affecting current session
      console.log("🚀 Calling edge function to create staff user...");
      console.log("📝 Staff data being sent:", {
        email: data.email,
        fullName: data.name,
        roleId: roleData.role_id,
        roleName: data.role,
        adminUserId: currentAdminUser.id,
        phone: data.phone,
        address: data.address,
        referencePhone: data.referencePhone,
        ktpNumber: data.ktpNumber,
        skckImage: data.skckImage,
        kkImage: data.kkImage,
        simImage: data.simImage,
        ktpImage: data.ktpImage,
        department: data.department,
        position: data.position,
        employeeId: data.employeeId,
        idCardImage: data.idCardImage,
        religion: data.religion,
        ethnicity: data.ethnicity,
        firstName: data.firstName,
        lastName: data.lastName,
      });
      const { data: authData, error: authError } =
        await supabase.functions.invoke(
          "supabase-functions-create-staff-user",
          {
            body: {
              email: data.email,
              password: data.password,
              fullName: data.name,
              roleId: roleData.role_id,
              roleName: data.role,
              adminUserId: currentAdminUser.id,
              phone: data.phone,
              address: data.address,
              referencePhone: data.referencePhone,
              ktpNumber: data.ktpNumber,
              skckImage: data.skckImage,
              kkImage: data.kkImage,
              simImage: data.simImage,
              ktpImage: data.ktpImage,
              department: data.department,
              position: data.position,
              employeeId: data.employeeId,
              idCardImage: data.idCardImage,
              religion: data.religion,
              ethnicity: data.ethnicity,
              firstName: data.firstName,
              lastName: data.lastName,
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

      console.log("✅ Staff created successfully via edge function");

      // Show success notification
      toast({
        variant: "default",
        title: "Berhasil!",
        description: `Akun staff ${data.name} berhasil dibuat`,
      });

      // Close the dialog automatically on success
      setShowRegistrationDialog(false);
    } catch (error) {
      console.error("Error registering staff:", error);
      // Show error notification
      toast({
        variant: "destructive",
        title: "Gagal!",
        description: `Gagal membuat akun staff: ${error.message}`,
      });
      // Keep dialog open on error so user can fix the issue
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8">
      <Card className="bg-white shadow-md border-0 overflow-hidden rounded-xl">
        <CardHeader className="bg-gradient-to-r from-primary-tosca/10 to-primary-dark/10 pb-4">
          <CardTitle className="text-2xl font-bold text-primary-dark">
            Staff Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UserManagement onAddStaff={handleOpenRegistrationForm} />
        </CardContent>
      </Card>

      <Dialog
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Staff Registration</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new staff member with complete
              information.
            </DialogDescription>
          </DialogHeader>
          <RegistrationForm
            onRegister={handleRegister}
            isLoading={isSubmitting}
            showPassword={showPassword}
            togglePasswordVisibility={togglePasswordVisibility}
            initialRole="Staff Admin"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffPage;
