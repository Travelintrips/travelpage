import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function MinimalRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Register with absolutely minimal approach - no metadata at all
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          // Explicitly set data to empty object to avoid any metadata issues
          data: {},
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Store basic info in localStorage only
        localStorage.setItem("userId", data.user.id);
        localStorage.setItem("userRole", "Customer");
        localStorage.setItem("userName", formData.name);

        setSuccess(true);
        setFormData({
          email: "",
          password: "",
          name: "",
        });
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card">
      <CardHeader>
        <CardTitle className="text-xl text-center">
          Minimal Registration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg">
            Registration successful! You can now log in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
