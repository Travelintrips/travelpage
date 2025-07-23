import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const AdminLogin = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleLoginSubmit = async (data: LoginFormValues) => {
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.error("Login error:", error);
        setLoginError(error.message);
        return;
      }

      // Check if user has Admin role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role_id, roles(name)")
        .eq("id", authData.user.id)
        .single();

      if (userError) {
        console.error("Error fetching user role:", userError);
        setLoginError("Error verifying user role. Please try again.");
        await supabase.auth.signOut();
        return;
      }

      const userRole = userData?.roles?.name || "";
      console.log("User role from database:", userRole);

      // Allow Admin, Staff, and Staff Trips roles to access the admin panel
      const allowedRoles = ["Admin", "Staff", "Staff Trips"];
      if (!allowedRoles.includes(userRole)) {
        setLoginError(
          "Access denied. Only administrators and staff can log in here.",
        );
        await supabase.auth.signOut();
        return;
      }

      // Store user role in local storage
      localStorage.setItem("userRole", userRole);
      localStorage.setItem("userId", authData.user.id);

      // Update auth_user in localStorage for shared authentication
      const userDataForStorage = {
        id: authData.user.id,
        role: userRole,
        email: authData.user.email || "",
        name: authData.user.email?.split("@")[0] || "User",
      };
      localStorage.setItem("auth_user", JSON.stringify(userDataForStorage));

      // Set session data to ensure role persists
      await supabase.auth.updateUser({
        data: { role: userRole },
      });

      // Redirect to admin dashboard
      navigate("/admin");
    } catch (error) {
      setLoginError("An unexpected error occurred");
      console.error("Login error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary-tosca/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Admin Login
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleLoginSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="name@example.com"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pl-10 pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute right-3 top-3 text-muted-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {loginError && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {loginError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <div className="text-sm text-muted-foreground text-center">
            This login is restricted to administrators and staff only.
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminLogin;
