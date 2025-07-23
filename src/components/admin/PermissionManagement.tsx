import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, RefreshCw } from "lucide-react";

interface Role {
  id: number;
  name: string;
}

interface Module {
  id: number;
  name: string;
}

interface Permission {
  id: number;
  role_id: number;
  module_id: number;
  action: string;
  allowed: boolean;
}

const actions = ["view", "edit", "suspend", "delete"];

const PermissionManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("roles")
        .select("*")
        .order("id");

      if (rolesError) throw rolesError;

      // Fetch modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("*")
        .order("id");

      if (modulesError) throw modulesError;

      // Fetch permissions
      const { data: permissionsData, error: permissionsError } = await supabase
        .from("permissions")
        .select("*");

      if (permissionsError) throw permissionsError;

      setRoles(rolesData || []);
      setModules(modulesData || []);
      setPermissions(permissionsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Error fetching data",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (
    roleId: number,
    moduleId: number,
    action: string,
    allowed: boolean,
  ) => {
    try {
      setSaving(true);

      // Find if permission already exists
      const existingPermission = permissions.find(
        (p) =>
          p.role_id === roleId &&
          p.module_id === moduleId &&
          p.action === action,
      );

      if (existingPermission) {
        // Update existing permission
        const { error } = await supabase
          .from("permissions")
          .update({ allowed })
          .eq("id", existingPermission.id);

        if (error) throw error;

        // Update local state
        setPermissions(
          permissions.map((p) =>
            p.id === existingPermission.id ? { ...p, allowed } : p,
          ),
        );
      } else {
        // Create new permission
        const { data, error } = await supabase
          .from("permissions")
          .insert([
            {
              role_id: roleId,
              module_id: moduleId,
              action,
              allowed,
            },
          ])
          .select();

        if (error) throw error;

        // Add new permission to local state
        if (data && data.length > 0) {
          setPermissions([...permissions, data[0]]);
        }
      }

      toast({
        title: "Permission updated",
        description: "The permission has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating permission:", error);
      toast({
        variant: "destructive",
        title: "Error updating permission",
        description: error.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const isPermissionAllowed = (
    roleId: number,
    moduleId: number,
    action: string,
  ) => {
    const permission = permissions.find(
      (p) =>
        p.role_id === roleId && p.module_id === moduleId && p.action === action,
    );
    return permission ? permission.allowed : false;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading permissions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Permission Management</h1>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Permissions</CardTitle>
          <CardDescription>
            Manage permissions for each role and module. Changes are saved
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Role / Module</TableHead>
                  {modules.map((module) => (
                    <TableHead
                      key={module.id}
                      className="text-center"
                      colSpan={4}
                    >
                      {module.name}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead></TableHead>
                  {modules.map((module) => (
                    <React.Fragment key={`actions-${module.id}`}>
                      {actions.map((action) => (
                        <TableHead
                          key={`${module.id}-${action}`}
                          className="text-center capitalize w-[100px]"
                        >
                          {action}
                        </TableHead>
                      ))}
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    {modules.map((module) => (
                      <React.Fragment key={`${role.id}-${module.id}`}>
                        {actions.map((action) => (
                          <TableCell
                            key={`${role.id}-${module.id}-${action}`}
                            className="text-center"
                          >
                            <Checkbox
                              checked={isPermissionAllowed(
                                role.id,
                                module.id,
                                action,
                              )}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(
                                  role.id,
                                  module.id,
                                  action,
                                  !!checked,
                                )
                              }
                              disabled={
                                saving ||
                                (role.name === "Admin" && action === "view")
                              } // Admin always has view permission
                              className="mx-auto"
                            />
                          </TableCell>
                        ))}
                      </React.Fragment>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {saving && (
            <div className="mt-4 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving changes...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionManagement;
