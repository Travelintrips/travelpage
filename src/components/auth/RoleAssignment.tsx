import React, { useState } from "react";
import { assignUserRole } from "@/lib/edgeFunctions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

interface RoleAssignmentProps {
  userId: string;
  currentRoleId?: number;
  onRoleAssigned?: (roleId: number) => void;
}

const RoleAssignment: React.FC<RoleAssignmentProps> = ({
  userId,
  currentRoleId,
  onRoleAssigned,
}) => {
  const [selectedRoleId, setSelectedRoleId] = useState<number | undefined>(
    currentRoleId,
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (value: string) => {
    setSelectedRoleId(parseInt(value, 10));
  };

  const handleAssignRole = async () => {
    console.log("Assigning role to user:", userId, "Role ID:", selectedRoleId);
    if (!selectedRoleId) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await assignUserRole(userId, selectedRoleId);

      if (error) {
        toast({
          title: "Error assigning role",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Role assigned successfully",
        description: "The user's role has been updated",
      });

      if (onRoleAssigned) {
        onRoleAssigned(selectedRoleId);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      console.error("Error assigning role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Assign Role</label>
        <Select
          onValueChange={handleRoleChange}
          defaultValue={currentRoleId?.toString()}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Admin</SelectItem>
            <SelectItem value="2">Manager</SelectItem>
            <SelectItem value="3">Supervisor</SelectItem>
            <SelectItem value="4">Staff</SelectItem>
            <SelectItem value="5">HRD</SelectItem>
            <SelectItem value="6">Customer</SelectItem>
            <SelectItem value="7">Driver Mitra</SelectItem>
            <SelectItem value="8">Driver Perusahaan</SelectItem>
            <SelectItem value="9">Staff Traffic</SelectItem>
            <SelectItem value="10">Staff Admin</SelectItem>
            <SelectItem value="11">Staff Trips</SelectItem>
            <SelectItem value="12">Dispatcher</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={handleAssignRole}
        disabled={isLoading || !selectedRoleId}
        className="w-full"
      >
        {isLoading ? "Assigning..." : "Assign Role"}
      </Button>
    </div>
  );
};

export default RoleAssignment;
