import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

interface DriverData {
  name?: string;
  email?: string;
  phone?: string;
  license_number?: string;
  license_expiry?: string | null;
  selfie_url?: string | null;
  sim_url?: string | null;
  stnk_url?: string | null;
  kk_url?: string | null;
  status?: string;
}

const DriverProfile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userId, userRole } = useAuth();
  const [driverData, setDriverData] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDriverData = async () => {
      if (isAuthenticated && userId) {
        try {
          const { data, error } = await supabase
            .from("drivers")
            .select("*")
            .eq("id", userId)
            .single();

          if (error) {
            console.error("Error fetching driver data:", error);
          } else if (data) {
            setDriverData(data);
          }
        } catch (error) {
          console.error("Error in fetchDriverData:", error);
        }
      }
      setLoading(false);
    };

    fetchDriverData();
  }, [isAuthenticated, userId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>Loading driver profile...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="pb-4 border-b">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-2xl md:text-3xl">
                  Driver Profile
                </CardTitle>
                <CardDescription className="text-lg mt-1">
                  Selamat Datang
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <p className="text-center text-muted-foreground">
                Please login or register to access your driver profile
              </p>
              <div className="flex gap-4">
                <Button onClick={() => navigate("/")} variant="default">
                  Login
                </Button>
                <Button
                  onClick={() => navigate("/driver-perusahaan")}
                  variant="outline"
                >
                  Register
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl md:text-3xl">
                Driver Profile
              </CardTitle>
              <CardDescription className="text-lg mt-1">
                Selamat Datang, {driverData?.name || "Driver"}
              </CardDescription>
            </div>
            <Button onClick={() => navigate("/")} variant="outline" size="sm">
              Back to Home
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {driverData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    Personal Information
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {driverData.name}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {driverData.email}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {driverData.phone}
                    </p>
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${driverData.status === "active" ? "bg-green-100 text-green-800" : driverData.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                      >
                        {driverData.status?.toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">License Information</h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">SIM Number:</span>{" "}
                      {driverData.license_number}
                    </p>
                    <p>
                      <span className="font-medium">License Expiry:</span>{" "}
                      {driverData.license_expiry
                        ? new Date(
                            driverData.license_expiry,
                          ).toLocaleDateString()
                        : "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Documents</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {driverData.selfie_url && (
                    <div className="space-y-2">
                      <p className="font-medium">Selfie</p>
                      <img
                        src={driverData.selfie_url}
                        alt="Selfie"
                        className="w-full h-40 object-cover rounded-md border"
                      />
                    </div>
                  )}
                  {driverData.sim_url && (
                    <div className="space-y-2">
                      <p className="font-medium">SIM</p>
                      <img
                        src={driverData.sim_url}
                        alt="SIM"
                        className="w-full h-40 object-cover rounded-md border"
                      />
                    </div>
                  )}
                  {driverData.stnk_url && (
                    <div className="space-y-2">
                      <p className="font-medium">STNK</p>
                      <img
                        src={driverData.stnk_url}
                        alt="STNK"
                        className="w-full h-40 object-cover rounded-md border"
                      />
                    </div>
                  )}
                  {driverData.kk_url && (
                    <div className="space-y-2">
                      <p className="font-medium">Kartu Keluarga</p>
                      <img
                        src={driverData.kk_url}
                        alt="Kartu Keluarga"
                        className="w-full h-40 object-cover rounded-md border"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No driver data found. Please complete your registration.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverProfile;
