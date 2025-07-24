import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import RegistrationForm, { RegisterFormValues } from "./RegistrationForm";
import { uploadDocumentImages } from "@/lib/edgeFunctions";
import { useNavigate, useLocation } from "react-router-dom";
import AuthModal from "./AuthModal";
import { useAuth } from "@/contexts/AuthContext";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface AuthFormProps {
  onLogin?: (data: LoginFormValues) => void;
  onRegister?: (data: RegisterFormValues) => void;
  isLoading?: boolean;
  onAuthStateChange?: (state: boolean) => void;
  initialMode?: "signin" | "register";
  initialTab?: "login" | "register";
  onClose?: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  onLogin = () => {},
  onRegister = () => {},
  isLoading = false,
  onAuthStateChange,
  initialMode = "login",
  initialTab,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">(
    initialTab || (initialMode === "signin" ? "login" : "register"),
  );
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const authUserStr = localStorage.getItem("auth_user");
    if (authUserStr) {
      try {
        const authUser = JSON.parse(authUserStr);
        console.log("Found auth user in localStorage:", authUser);
        if (authUser && authUser.id) {
          console.log("User found in localStorage");
          if (onAuthStateChange) {
            onAuthStateChange(true);
          }
        }
      } catch (e) {
        console.error("Error parsing auth_user from localStorage:", e);
      }
    }
  }, [onAuthStateChange]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLoginSuccess = async (authData: any) => {
    console.log(
      "🎯 handleLoginSuccess called with session:",
      !!authData.session,
    );

    // Prevent multiple rapid calls that cause flickering
    if (isSubmitting) {
      console.log("🚫 Login already in progress, preventing duplicate call");
      return;
    }

    const user = authData.user;
    const userMeta = user?.user_metadata || {};
    console.log("📋 User metadata:", userMeta);

    // Try to get user data including role from users table first
    console.log("🔍 Fetching user data from users table...");
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("full_name, role, role_name")
      .eq("id", user.id)
      .single();

    let userFullName = "";
    let userRole = userMeta.role || "Customer";

    if (!userError && userData) {
      if (userData.full_name) {
        userFullName = userData.full_name.trim();
        console.log("✅ Found name in users table during login:", userFullName);
      }
      if (userData.role) {
        userRole = userData.role;
        console.log("✅ Found role in users table during login:", userRole);
      } else if (userData.role_name) {
        userRole = userData.role_name;
        console.log(
          "✅ Found role_name in users table during login:",
          userRole,
        );
      }
    } else {
      console.log("🔍 Checking customers table for name...");
      // Check if user is a customer, try customers table
      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("full_name, name")
        .eq("id", user.id)
        .single();

      if (!customerError && (customerData?.full_name || customerData?.name)) {
        userFullName = (customerData.full_name || customerData.name).trim();
        console.log(
          "✅ Found name in customers table during login:",
          userFullName,
        );
      } else {
        console.log("🔄 Using fallback name from metadata or email...");
        // Fallback to metadata
        userFullName =
          (userMeta.full_name && userMeta.full_name.trim()) ||
          (userMeta.name && userMeta.name.trim()) ||
          user.email?.split("@")[0] ||
          "Guest";
        console.log("📝 Using fallback name during login:", userFullName);
      }
    }

    // If still no role found, try staff table
    if (!userRole || userRole === "Customer") {
      console.log("🔍 Checking staff table for role...");
      try {
        const { data: staffData, error: staffError } = await supabase
          .from("staff")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!staffError && staffData?.role) {
          userRole = staffData.role;
          console.log("✅ Found role in staff table during login:", userRole);
        }
      } catch (staffError) {
        console.warn("⚠️ Error checking staff table:", staffError);
      }
    }

    // Make sure we never use "Customer" as the name
    if (!userFullName || userFullName === "Customer") {
      userFullName = user.email?.split("@")[0] || "User";
      console.log(
        "🔄 Replaced empty/Customer name with email username:",
        userFullName,
      );
    }

    // Force save metadata to localStorage after successful login
    console.log("💾 Force saving fresh metadata to localStorage:");
    localStorage.setItem("userName", userFullName);
    localStorage.setItem("userRole", userRole);
    localStorage.setItem("userId", user.id);
    if (user.email) {
      localStorage.setItem("userEmail", user.email);
    }

    const userDataObj = {
      id: user.id,
      role: userRole,
      email: user.email || "",
      name: userFullName,
    };

    console.log("📋 Final user data object:", userDataObj);

    // Update user metadata to ensure consistency between UI and stored data
    const { error: updateMetadataError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        name: userFullName,
        full_name: userFullName,
      },
    });

    if (updateMetadataError) {
      console.warn("⚠️ Failed to update user metadata:", updateMetadataError);
    } else {
      console.log("✅ Updated user metadata with name:", userFullName);
    }

    localStorage.setItem("auth_user", JSON.stringify(userDataObj));
    console.log("✅ User logged in successfully with fresh data:", userDataObj);

    // Debounce auth state change to prevent flickering
    setTimeout(() => {
      if (onAuthStateChange) {
        console.log("🔄 Calling onAuthStateChange(true)...");
        onAuthStateChange(true);
      } else {
        console.log("⚠️ No onAuthStateChange handler provided");
      }
    }, 100);
  };

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (data: LoginFormValues) => {
    console.log("🔄 handleLoginSubmit called with:", {
      email: data.email,
      hasPassword: !!data.password,
    });

    setLoginError(null);
    setIsSubmitting(true);

    try {
      console.log("🚀 Login submission started with email:", data.email);

      // Clear any previous session data to prevent conflicts
      localStorage.removeItem("userRole");
      localStorage.removeItem("userId");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("driverData");
      localStorage.removeItem("userName");
      localStorage.removeItem("isAdmin");

      // Remove any session flags that might prevent login
      sessionStorage.removeItem("loggedOut");
      sessionStorage.removeItem("forceLogout");

      console.log("🔐 Attempting to sign in with email:", data.email);
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      console.log("📡 Sign in response:", error ? "❌ Error" : "✅ Success");
      if (error) {
        console.error("❌ Login error details:", {
          message: error.message,
          status: error.status,
          name: error.name,
        });
      }

      if (error) {
        console.error("❌ Login error:", error);
        setLoginError(error.message);
        setIsSubmitting(false);
        return;
      }

      console.log("👤 Processing user data:", {
        userId: authData.user.id,
        email: authData.user.email,
        metadata: authData.user.user_metadata,
      });

      const userRole = authData.user?.user_metadata?.role || "Customer";
      const isAdmin = userRole === "Admin";
      localStorage.setItem("isAdmin", isAdmin ? "true" : "false");
      console.log("🏷️ User role determined:", userRole, "isAdmin:", isAdmin);

      if (userRole === "Driver") {
        console.log("🚗 Checking driver status...");
        const { data: driverData, error: driverError } = await supabase
          .from("drivers")
          .select("status")
          .eq("id", authData.user.id)
          .single();

        if (driverError) {
          console.error("❌ Error fetching driver status:", driverError);
        } else if (driverData && driverData.status === "suspended") {
          console.log("🚫 Driver account suspended");
          setLoginError(
            "Your account has been suspended. Please contact an administrator.",
          );
          await supabase.auth.signOut();
          setIsSubmitting(false);
          return;
        }
      }

      console.log("✅ Calling handleLoginSuccess...");
      await handleLoginSuccess(authData);
      console.log("📞 Calling onLogin callback...");
      onLogin(data);
      console.log("✅ onLogin callback completed");

      const userMeta = authData.user?.user_metadata || {};

      // Try to get name from users table first
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", authData.user.id)
        .single();

      let userFullName = "";

      if (!userError && userData?.full_name) {
        userFullName = userData.full_name.trim();
        console.log(
          "Found name in users table during login process:",
          userFullName,
        );
      } else {
        // Check if user is a customer, try customers table
        const { data: customerData, error: customerError } = await supabase
          .from("customers")
          .select("full_name, name")
          .eq("id", authData.user.id)
          .single();

        if (!customerError && (customerData?.full_name || customerData?.name)) {
          userFullName = (customerData.full_name || customerData.name).trim();
          console.log(
            "Found name in customers table during login process:",
            userFullName,
          );
        } else {
          // Fallback to metadata
          if (userMeta.full_name) {
            userFullName = userMeta.full_name.trim();
          } else if (userMeta.name) {
            userFullName = userMeta.name.trim();
          } else if (authData.user?.email) {
            userFullName = authData.user.email.split("@")[0];
          } else {
            userFullName = "Guest"; // fallback kalau semuanya gagal
          }
          console.log(
            "Using fallback name during login process:",
            userFullName,
          );
        }
      }

      // Make sure we never use "Customer" as the name
      if (
        !userFullName ||
        userFullName.trim() === "" ||
        userFullName === "Customer"
      ) {
        userFullName = authData.user.email?.split("@")[0] || "User";
        console.log(
          "Using email username instead of empty/Customer name:",
          userFullName,
        );
      }

      const userDataObj = {
        id: authData.user.id,
        role: userRole,
        email: authData.user.email || "",
        name: userFullName,
      };

      // Update user metadata to ensure consistency between UI and stored data
      const { error: updateMetadataError } = await supabase.auth.updateUser({
        data: {
          ...authData.user.user_metadata,
          name: userFullName,
          full_name: userFullName,
        },
      });

      if (updateMetadataError) {
        console.warn("⚠️ Failed to update user metadata:", updateMetadataError);
      } else {
        console.log("✅ Updated user metadata with name:", userFullName);
      }

      localStorage.setItem("auth_user", JSON.stringify(userDataObj));
      localStorage.setItem("userName", userFullName);
      console.log("Saved userName to localStorage during login:", userFullName);

      console.log("🏷️ User logged in with role:", userRole);
      console.log("🆔 User logged in successfully with ID:", authData.user.id);

      console.log("📞 Calling onLogin callback (second time)...");
      onLogin(data);
      console.log("✅ onLogin callback completed (second time)");

      if (onAuthStateChange) {
        console.log("🔄 Updating auth state to true (second time)...");
        onAuthStateChange(true);
      } else {
        console.log("⚠️ No onAuthStateChange handler provided (second time)");
      }

      // Force immediate redirect for Admin users
      if (userRole === "Admin" || isAdmin) {
        console.log("🔀 Redirecting Admin user to admin panel");
        navigate("/admin");
      } else {
        console.log("ℹ️ No redirect needed for role:", userRole);
      }

      if (onClose) {
        console.log("🚪 Closing auth form after successful login");
        onClose();
      }
    } catch (error) {
      console.error("💥 Unexpected login error:", {
        error,
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      });
      setLoginError(
        error instanceof Error ? error.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
      console.log("🏁 Login submission completed, isSubmitting set to false");
    }
  };

  const handleRegisterSubmit = async (data: RegisterFormValues) => {
    setIsSubmitting(true);

    let selfieUrl = "";

    if (data.role === "Customer" && data.selfieImage) {
      // ✅ Validasi format base64 image
      if (!data.selfieImage.startsWith("data:image/")) {
        alert("Format gambar selfie tidak valid.");
        setIsSubmitting(false);
        return;
      }

      // ✅ Ambil access token user yang login
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        alert("Anda belum login. Silakan login terlebih dahulu.");
        setIsSubmitting(false);
        return;
      }

      try {
        const fileName = `drivers/selfie/selfie_${Date.now()}.jpg`;
        const base64Image = data.selfieImage.split(",")[1]; // hilangkan prefix
        const byteCharacters = atob(base64Image);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "image/jpeg" });

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("drivers")
          .upload(fileName, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          console.error("❌ Upload error:", uploadError);
          throw new Error(uploadError.message || "Upload gagal.");
        }

        // Dapatkan public URL
        const { data: publicData } = supabase.storage
          .from("drivers")
          .getPublicUrl(fileName);

        selfieUrl = publicData.publicUrl;
        console.log("✅ Selfie uploaded successfully:", selfieUrl);
      } catch (err) {
        console.error("❌ Failed to upload selfie before sign up:", err);
        alert("Gagal upload selfie. Silakan coba lagi.");
        setIsSubmitting(false);
        return;
      }
    }

    console.log("📸 Using selfie URL:", selfieUrl);

    try {
      console.log("✅ Registering with email and password...");

      const { data: authData, error: signUpError } = await supabase.auth.signUp(
        {
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}`,
            data: {
              full_name: data.name || "",
              phone_number: data.phone || "",
              role: "Customer",
              selfie_url: selfieUrl, // ✅ simpan hasil upload selfie
            },
          },
        },
      );

      if (signUpError) {
        console.error("❌ Registration error:", signUpError);
        throw signUpError;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (!authData.user) {
        console.error("User creation failed but no error was returned");
        throw new Error("Failed to create user account");
      }

      if (authData.user) {
        let documentUrls = {
          ktpUrl: "",
          licenseUrl: "",
          idCardUrl: "",
          kkUrl: "",
          stnkUrl: "",
        };

        const needsUpload =
          data.ktpImage ||
          data.simImage ||
          data.idCardImage ||
          data.kkImage ||
          data.stnkImage;

        if (needsUpload) {
          try {
            console.log("Uploading documents for user:", authData.user.id);

            const { data: uploadResult, error: uploadError } =
              await uploadDocumentImages(
                authData.user.id,
                data.ktpImage,
                data.simImage,
                data.idCardImage,
                data.kkImage,
                data.stnkImage,
              );

            if (uploadError) {
              console.error("Error uploading documents:", uploadError);
            } else if (uploadResult) {
              console.log("Documents uploaded successfully:", uploadResult);
              documentUrls = {
                ktpUrl: uploadResult.ktpUrl || documentUrls.ktpUrl,
                licenseUrl: uploadResult.licenseUrl || documentUrls.licenseUrl,
                idCardUrl: uploadResult.idCardUrl || documentUrls.idCardUrl,
                kkUrl: uploadResult.kkUrl || documentUrls.kkUrl,
                stnkUrl: uploadResult.stnkUrl || documentUrls.stnkUrl,
              };

              console.log("All documents uploaded successfully:", {
                ktpUrl: documentUrls.ktpUrl,
                licenseUrl: documentUrls.licenseUrl,
                idCardUrl: documentUrls.idCardUrl,
                kkUrl: documentUrls.kkUrl,
                stnkUrl: documentUrls.stnkUrl,
              });

              if (data.role === "Driver Mitra") {
                console.log("Driver Mitra documents included in main upload");

                if (documentUrls) {
                  console.log("Document URLs after upload:", {
                    ktpUrl: documentUrls.ktpUrl,
                    licenseUrl: documentUrls.licenseUrl,
                    kkUrl: documentUrls.kkUrl,
                    stnkUrl: documentUrls.stnkUrl,
                  });
                }
              }
            }
          } catch (error) {
            console.error("Error in document upload process:", error);
          }
        }

        console.log("Using document URLs:", documentUrls);

        const { data: roleData, error: roleError } = await supabase
          .from("roles")
          .select("role_id")
          .ilike("role_name", data.role)
          .single();

        if (roleError) {
          console.error("Error fetching role ID:", roleError);
        }

        const roleId = roleData?.role_id || null;

        if (roleId && authData.user) {
          try {
            const { error: assignRoleError } = await supabase.functions.invoke(
              "supabase-functions-assignRole",
              {
                body: { userId: authData.user.id, roleId },
              },
            );

            if (assignRoleError) {
              console.error("Error assigning role:", assignRoleError);
            }
          } catch (assignError) {
            console.error("Error invoking assignRole function:", assignError);
          }
        }

        try {
          const { error: updateError } = await supabase.from("users").upsert(
            {
              id: authData.user.id,
              selfie_url: selfieUrl,
              full_name: data.name,
              email: data.email,
              phone: data.phone,
              // Omit role_id to avoid type conversion issues
            },
            { onConflict: "id" },
          );

          if (updateError) {
            console.error("Error updating user record:", updateError);
          }
        } catch (upsertError) {
          console.error("Exception during user upsert:", upsertError);
          // Continue with the registration process even if this fails
        }

        if (data.role === "Customer") {
          const { data: existingCustomer, error: checkCustomerError } =
            await supabase
              .from("customers")
              .select("id")
              .eq("id", authData.user.id)
              .single();

          if (
            checkCustomerError &&
            !checkCustomerError.message.includes("No rows found")
          ) {
            console.error(
              "Error checking existing customer:",
              checkCustomerError,
            );
          }

          if (existingCustomer) {
            const { error: updateCustomerError } = await supabase
              .from("customers")
              .update({
                full_name: data.name,
                email: data.email,
                phone: data.phone,
                selfie_url: selfieUrl,
              })
              .eq("id", authData.user.id);

            if (updateCustomerError) {
              console.error(
                "Error updating customer record:",
                updateCustomerError,
              );
            }
          } else {
            const { error: customerError } = await supabase
              .from("customers")
              .insert({
                id: authData.user.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                selfie_url: selfieUrl,
              });

            if (customerError) {
              console.error("Error creating customer record:", customerError);
            }
          }
        } else if (
          data.role === "Driver Mitra" ||
          data.role === "Driver Perusahaan"
        ) {
          const { data: existingDriver, error: checkDriverError } =
            await supabase
              .from("drivers")
              .select("id")
              .eq("id", authData.user.id)
              .single();

          if (
            checkDriverError &&
            !checkDriverError.message.includes("No rows found")
          ) {
            console.error("Error checking existing driver:", checkDriverError);
          }

          const driverData = {
            id: authData.user.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            selfie_url: selfieUrl,
            license_number: data.licenseNumber,
            license_expiry: data.licenseExpiry,
            reference_phone: data.referencePhone,
            driver_type: data.role === "Driver Mitra" ? "mitra" : "perusahaan",
            status: "active",
            ktp_url: documentUrls.ktpUrl,
            sim_url: documentUrls.licenseUrl,
            kk_url: documentUrls.kkUrl,
            stnk_url: documentUrls.stnkUrl,
            first_name: data.firstName,
            last_name: data.lastName,
            address: data.address,
            birth_place: data.birthPlace,
            birth_date: data.birthDate,
            religion: data.religion,
          };

          if (data.role === "Driver Mitra") {
            Object.assign(driverData, {
              color: data.color,
              license_plate: data.license_plate,
              make: data.make,
              model: data.model,
              year: data.year,
              vehicle_type: data.type,
              category: data.category,
              seats: data.seats,
              transmission: data.transmission,
              fuel_type: data.fuel_type,
            });
          }

          console.log("Driver data prepared for insertion/update:", {
            id: driverData.id,
            name: driverData.name,
            document_urls: {
              ktp_url: driverData.ktp_url,
              sim_url: driverData.sim_url,
              kk_url: driverData.kk_url,
              stnk_url: driverData.stnk_url,
            },
          });

          if (existingDriver) {
            const { error: updateDriverError } = await supabase
              .from("drivers")
              .update(driverData)
              .eq("id", authData.user.id);

            if (updateDriverError) {
              console.error("Error updating driver record:", updateDriverError);
            }
          } else {
            const { error: driverError } = await supabase
              .from("drivers")
              .insert(driverData);

            if (driverError) {
              console.error("Error creating driver record:", driverError);
            }
          }
        } else if (data.role === "Staff") {
          const { data: existingStaff, error: checkStaffError } = await supabase
            .from("staff")
            .select("id")
            .eq("id", authData.user.id)
            .single();

          if (
            checkStaffError &&
            !checkStaffError.message.includes("No rows found")
          ) {
            console.error("Error checking existing staff:", checkStaffError);
          }

          const staffData = {
            id: authData.user.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            selfie_url: selfieUrl,
            department: data.department,
            position: data.position,
            employee_id: data.employeeId,
            id_card_url: documentUrls.idCardUrl,
          };

          console.log("Staff data prepared for insertion/update:", {
            id: staffData.id,
            name: staffData.name,
            document_urls: {
              id_card_url: staffData.id_card_url,
            },
          });

          if (existingStaff) {
            const { error: updateStaffError } = await supabase
              .from("staff")
              .update(staffData)
              .eq("id", authData.user.id);

            if (updateStaffError) {
              console.error("Error updating staff record:", updateStaffError);
            }
          } else {
            const { error: staffError } = await supabase
              .from("staff")
              .insert(staffData);

            if (staffError) {
              console.error("Error creating staff record:", staffError);
            }
          }
        }

        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userId", authData.user.id);
        if (authData.user.email) {
          localStorage.setItem("userEmail", authData.user.email);
        }

        const userData = {
          id: authData.user.id,
          role: data.role,
          email: authData.user.email || "",
        };
        localStorage.setItem("auth_user", JSON.stringify(userData));

        console.log(
          `User registered successfully with role: ${data.role} (ID: ${roleId})`,
        );
      }

      await onRegister(data);

      // For Customer role, don't automatically log in after registration
      if (data.role === "Customer") {
        console.log(
          "Customer registered successfully, redirecting to login page",
        );
        // Sign out if automatically signed in
        await supabase.auth.signOut();

        // Clear any auth data that might have been set
        localStorage.removeItem("auth_user");
        localStorage.removeItem("userId");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("userName");

        // Show message to user
        alert(
          "Registration successful! Please log in to complete your profile with a selfie verification.",
        );

        // Force page refresh and redirect to login page
        setTimeout(() => {
          window.location.href = "/login";
          window.location.reload();
        }, 100);
      } else {
        // For other roles, keep the existing behavior
        if (onAuthStateChange) {
          console.log("Updating auth state to true after registration");
          onAuthStateChange(true);
        } else {
          console.log("No onAuthStateChange handler provided for registration");
        }

        if (data.role === "Driver Mitra" || data.role === "Driver Perusahaan") {
          console.log(
            "Driver registered successfully, redirecting to driver profile",
          );
          navigate("/driver-profile");
        } else {
          console.log("User registered successfully");
        }
      }

      if (onClose) {
        console.log("Closing auth form after successful registration");
        onClose();
      }
    } catch (error) {
      console.error("Registration error:", error);
      setIsSubmitting(false);
      alert(
        `Registration failed: ${error.message || "Unknown error occurred"}`,
      );
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <AuthModal
      onClose={onClose}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      loginForm={loginForm}
      handleLoginSubmit={handleLoginSubmit}
      loginError={loginError}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      showPassword={showPassword}
      togglePasswordVisibility={togglePasswordVisibility}
      handleRegisterSubmit={handleRegisterSubmit}
    />
  );
};

export default AuthForm;
