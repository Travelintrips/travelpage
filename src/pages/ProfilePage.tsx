import React from "react";
import UserDashboard from "@/components/dashboard/UserDashboard";
import { useAuth } from "@/contexts/AuthContext";

const ProfilePage = () => {
  const { userEmail, userRole, userName } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <UserDashboard />
    </div>
  );
};

export default ProfilePage;
