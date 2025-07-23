import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";

interface Role {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export default function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentRole, setCurrentRole] = useState<Partial<Role>>({});
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("id");

      if (error) throw error;
      setRoles(data || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast({
        variant: "destructive",
        title: "Error fetching roles",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (role?: Role) => {
    if (role) {
      setIsEditMode(true);
      setCurrentRole(role);
      setName(role.name);
      setDescription(role.description || "");
    } else {
      setIsEditMode(false);
      setCurrentRole({});
      setName("");
      setDescription("");
    }
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEditMode) {
        // Update existing role
        const { error } = await supabase
          .from("roles")
          .update({
            name,
            description,
          })
          .eq("id", currentRole.id);

        if (error) throw error;

        toast({
          title: "Role updated",
          description: "Role has been updated successfully",
        });
      } else {
        // Create new role
        const { error } = await supabase.from("roles").insert({
          name,
          description,
        });

        if (error) throw error;

        toast({
          title: "Role created",
          description: "Role has been created successfully",
        });
      }

      setIsOpen(false);
      fetchRoles();
    } catch (error) {
      console.error("Error saving role:", error);
      toast({
        variant: "destructive",
        title: "Error saving role",
        description: error.message,
      });
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      // Check if role is assigned to any users
      const { data: usersWithRole, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("role_id", roleId);

      if (checkError) throw checkError;

      if (usersWithRole && usersWithRole.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete role",
          description: `This role is assigned to ${usersWithRole.length} user(s). Please reassign these users before deleting.`,
        });
        return;
      }

      // Delete role
      const { error } = await supabase.from("roles").delete().eq("id", roleId);

      if (error) throw error;

      toast({
        title: "Role deleted",
        description: "Role has been deleted successfully",
      });

      fetchRoles();
    } catch (error) {
      console.error("Error deleting role:", error);
      toast({
        variant: "destructive",
        title: "Error deleting role",
        description: error.message,
      });
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Role Management</h2>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading roles...</p>
        </div>
      ) : (
        <Table>
          <TableCaption>List of all roles in the system</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>{role.id}</TableCell>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>{role.description || "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(role)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteRole(role.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Role" : "Add New Role"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Update role details below."
                : "Fill in the details to create a new role."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{isEditMode ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
