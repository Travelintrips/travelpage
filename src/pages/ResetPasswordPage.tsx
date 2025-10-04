import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
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
import { Alert, AlertDescription } from "@/components/ui/alert";

// ------------------ Validation -------------------
const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

// ------------------ Component -------------------
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { exitRecoveryMode } = useAuth();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // ------------------ Handle recovery session -------------------
  useEffect(() => {
    const url = new URL(window.location.href);

    // Case 1: Supabase v2 (query param ?code=...&type=recovery)
    const code = url.searchParams.get("code");
    const type = url.searchParams.get("type");

    if (code && type === "recovery") {
      console.log("[ResetPassword] Recovery code detected via query params");
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error("[ResetPassword] Error exchanging code:", error);
          setError("Invalid or expired reset link.");
        } else {
          console.log(
            "[ResetPassword] Recovery session established:",
            data.session?.user?.id
          );
          setError(null);
        }
      });
      return;
    }

    // Case 2: Supabase legacy (hash fragment #access_token=...)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const hashType = params.get("type");

      if (accessToken && refreshToken && hashType === "recovery") {
        console.log("[ResetPassword] Recovery tokens detected via hash");
        supabase.auth
          .setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          .then(({ data, error }) => {
            if (error) {
              console.error("[ResetPassword] Error setting recovery session:", error);
              setError("Invalid or expired reset link.");
            } else {
              console.log(
                "[ResetPassword] Recovery session established:",
                data.session?.user?.id
              );
              setError(null);
            }
          });
        return;
      }
    }

    // Jika tidak ada token sama sekali
    setError("Warning: Please ensure you accessed this page from a valid reset link.Or this link has expired,please request new update password");
  }, []);

  // ------------------ Handle form submit -------------------
  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      console.log("[ResetPassword] Attempting to update password...");

      // Update password (session already set in useEffect)
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        console.error("[ResetPassword] Password update error:", error);
        setError(error.message);
        return;
      }

      console.log("[ResetPassword] Password updated successfully");
      setMessage("Password has been successfully updated!");

      // CRITICAL: Exit recovery mode BEFORE signing out
      console.log("[ResetPassword] Exiting recovery mode...");
      exitRecoveryMode?.();
      
      // Clear recovery mode from sessionStorage
      sessionStorage.removeItem("passwordRecoveryMode");
      
      // Wait a bit to ensure recovery mode is cleared
      await new Promise(resolve => setTimeout(resolve, 500));

      // Sign out and redirect
      setTimeout(async () => {
        console.log("[ResetPassword] Signing out and redirecting...");
        await supabase.auth.signOut();
        navigate("/");
      }, 1500);
    } catch (err) {
      console.error("Reset password error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ------------------ Render UI -------------------
  return (
    <Card className="max-w-md mx-auto mt-10">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        {...field} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type={showConfirmPassword ? "text" : "password"} 
                        {...field} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Alerts */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {message && (
              <Alert>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}