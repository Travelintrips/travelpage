import React from "react";
import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface StaffLinkProps {
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
}

const StaffLink = ({
  variant = "default",
  size = "default",
  showIcon = true,
  className = "",
}: StaffLinkProps) => {
  // Use the isAdmin value from useAuth hook
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return null;
  }

  return (
    <Button variant={variant} size={size} asChild className={className}>
      <Link to="/admin" className="flex items-center">
        {showIcon && <Users className="mr-2 h-4 w-4" />}
        Manage Staff
      </Link>
    </Button>
  );
};

export default StaffLink;
