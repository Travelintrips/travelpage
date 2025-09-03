import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";
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
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import RegistrationForm from "./RegistrationForm";
import { supabase } from "@/lib/supabase";

interface ModalProps {
  onClose: () => void;
  activeTab: "login" | "register";
  setActiveTab: (tab: "login" | "register") => void;
  loginForm: any;
  handleLoginSubmit: (data: any) => void;
  loginError: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  showPassword: boolean;
  togglePasswordVisibility: () => void;
  handleRegisterSubmit: (data: any) => void;
}

const AuthModal: React.FC<ModalProps> = ({
  onClose,
  activeTab,
  setActiveTab,
  loginForm,
  handleLoginSubmit,
  loginError,
  isLoading,
  isSubmitting,
  showPassword,
  togglePasswordVisibility,
  handleRegisterSubmit,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Clear any session flags that might prevent login when modal opens
  useEffect(() => {
    // Remove any session flags that might prevent login
    sessionStorage.removeItem("loggedOut");
    sessionStorage.removeItem("forceLogout");

    // Also ensure we're signed out from Supabase when opening the modal
    const checkAndClearSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // No active session, clear any stale data
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("sb-refresh-token");
        localStorage.removeItem("sb-access-token");
        localStorage.removeItem("sb-auth-token");
      }
    };

    checkAndClearSession();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        typeof onClose === "function"
      ) {
        onClose();
      }
    };

    // Add event listener for outside clicks
    document.addEventListener("mousedown", handleClickOutside);

    // Add event listener for escape key
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && typeof onClose === "function") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscKey);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div ref={modalRef} className="relative w-full max-w-6xl">
        {/* Tombol close pojok kanan atas */}
        <Button
          className="absolute top-4 right-4 z-50 text-gray-500 hover:text-black"
          variant="ghost"
          size="icon"
          onClick={() => typeof onClose === "function" && onClose()}
        >
          <X className="w-6 h-6" />
        </Button>
        <Card className="w-full bg-card shadow-lg flex flex-col md:flex-row overflow-hidden rounded-xl">
          {/* Left side - Header and description */}
          <div className="md:w-1/3 bg-primary/10 flex flex-col justify-center p-6">
            <CardHeader className="pb-2 md:pb-0">
              <CardTitle className="text-2xl text-center md:text-left font-bold">
                Sign in to your account or create a new one
              </CardTitle>
            </CardHeader>
            <div className="hidden md:block mt-6 space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
                <p className="text-sm">Easy booking process</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
                <p className="text-sm">Wide selection of vehicles</p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
                <p className="text-sm">24/7 customer support</p>
              </div>
            </div>
          </div>

          {/* Right side - Form content */}
          <div className="md:w-2/3 p-4 md:p-6">
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "login" | "register")
              }
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(handleLoginSubmit)}
                    className="space-y-3"
                  >
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="email@example.com"
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
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="******"
                                className="pl-10"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1 h-7 w-7"
                                onClick={togglePasswordVisibility}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {loginError && (
                      <div className="text-sm text-destructive mb-2">
                        {loginError}
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || isSubmitting}
                      onClick={(e) => {
                      /*  console.log("🖱️ Login button clicked!");
                        console.log("📊 Current state:", {
                          isLoading,
                          isSubmitting,
                          formValid: loginForm.formState.isValid,
                          errors: loginForm.formState.errors,
                          values: loginForm.getValues(),
                        });*/

                        if (loginError) {
                         // console.log("🧹 Clearing previous login error");
                          loginForm.clearErrors();
                        }

                        // Don't prevent default - let form submission handle it
                    /*    console.log(
                          "✅ Button click handler completed, form will submit",
                        );*/
                      }}
                    >
                      {isLoading || isSubmitting ? "Signing in..." : "Sign In"}
                    </Button>

                    <div className="text-sm text-muted-foreground text-center md:hidden pt-2">
                      <p>
                        Don't have an account?{" "}
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => setActiveTab("register")}
                        >
                          Register
                        </Button>
                      </p>
                      <p className="mt-2">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-primary"
                          onClick={() => window.location.href = '/forgot-password'}
                        >
                          Forgot Password?
                        </Button>
                      </p>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent
                value="register"
                className="overflow-y-auto max-h-[60vh] md:max-h-[70vh] mt-0"
              >
                <RegistrationForm
                  onRegister={handleRegisterSubmit}
                  isLoading={isLoading}
                  showPassword={showPassword}
                  togglePasswordVisibility={togglePasswordVisibility}
                />

                <div className="text-sm text-muted-foreground text-center md:hidden pt-2">
                  <p>
                    Already have an account?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setActiveTab("login")}
                    >
                      Login
                    </Button>
                  </p>
                  <p className="mt-2">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-primary"
                      onClick={() => window.location.href = '/forgot-password'}
                    >
                      Forgot Password?
                    </Button>
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer only visible on larger screens */}
            <div className="hidden md:block mt-4">
              <div className="text-sm text-muted-foreground text-center">
                {activeTab === "login" ? (
                  <div>
                    <p>
                      Don't have an account?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => setActiveTab("register")}
                      >
                        Register
                      </Button>
                    </p>
                    <p className="mt-2">
                      <Button
                        variant="link"
                        className="p-0 h-auto text-primary"
                        onClick={() => window.location.href = '/forgot-password'}
                      >
                        Forgot Password?
                      </Button>
                    </p>
                  </div>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setActiveTab("login")}
                    >
                      Login
                    </Button>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuthModal;
