import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useSearchParams } from "react-router-dom";
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

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

const ResetPasswordPage: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      // CRITICAL: Validasi bahwa ini adalah recovery session
      if (accessToken && refreshToken && type === 'recovery') {
        console.log('[ResetPassword] Valid recovery session detected');
        
        // CRITICAL: Force sign out any existing session immediately
        const forceSignOut = async () => {
          try {
            console.log('[ResetPassword] Force signing out existing session...');
            await supabase.auth.signOut({ scope: 'local' });
            
            // Clear all auth storage
            localStorage.removeItem("auth_user");
            sessionStorage.removeItem("loggedOut");
            sessionStorage.removeItem("forceLogout");
            sessionStorage.removeItem("signOutInProgress");
            
            console.log('[ResetPassword] Existing session cleared');
          } catch (error) {
            console.log('[ResetPassword] Error clearing session:', error);
          }
        };
        
        forceSignOut();
        
        // Store tokens for later use but don't set session yet
        sessionStorage.setItem('reset_access_token', accessToken);
        sessionStorage.setItem('reset_refresh_token', refreshToken);
      } else {
        setError("Invalid or expired reset link.");
      }
    } else {
      setError("Invalid or expired reset link.");
    }
  }, []);

  const handleSubmit = async (data: ResetPasswordFormValues) => {
  setIsSubmitting(true);
  setMessage(null);
  setError(null);

  try {
    // ✅ Langsung update password (Supabase sudah tahu user dari recovery session)
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password has been successfully updated!");

      // ✅ Logout agar user tidak auto login dengan session recovery
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/");
      }, 2000);
    }
  } catch (err) {
    setError("An unexpected error occurred. Please try again.");
    console.error("Reset password error:", err);
  } finally {
    setIsSubmitting(false);
  }
};


  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Reset Password
            </CardTitle>
            <CardDescription className="text-center">
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            className="pl-10 pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-8 w-8"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            className="pl-10 pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1 h-8 w-8"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !!error}
                >
                  {isSubmitting ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate("/")}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Back to Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;