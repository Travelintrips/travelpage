import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { User, Search, Loader2 } from "lucide-react";

interface Agent {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role_id: number | null;
  role_name: string | null;
  nama_perusahaan: string | null;
}

const AgentManagement = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          created_at,
          full_name,
          email,
          phone_number,
          role_id,
          nama_perusahaan,
          roles!fk_users_roles(role_name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform the data to flatten the role information and filter for Agent role only
      const transformedData =
        data
          ?.map((user: any) => ({
            ...user,
            role_name: user.roles?.role_name || null,
          }))
          .filter((user: any) => user.role_name === "Agent") || [];

      setAgents(transformedData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching agents:", error);
      setLoading(false);
    }
  };

  const filteredAgents = agents.filter(
    (agent) =>
      (agent.full_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (agent.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (agent.phone_number || "").includes(searchTerm) ||
      (agent.role_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (agent.nama_perusahaan?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ),
  );

  return (
    <div className="space-y-6 bg-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Data Agent</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Data</CardTitle>
              <CardDescription>
                View all user data from the system
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading users...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Role ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAgents.map((agent) => (
                    <TableRow key={agent.id}>
                      <TableCell className="font-medium">
                        {agent.full_name || "-"}
                      </TableCell>
                      <TableCell>{agent.email || "-"}</TableCell>
                      <TableCell>{agent.phone_number || "-"}</TableCell>
                      <TableCell>{agent.role_id || "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {agent.role_name || "No Role"}
                        </span>
                      </TableCell>
                      <TableCell>{agent.nama_perusahaan || "-"}</TableCell>
                      <TableCell>
                        {new Date(agent.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredAgents.length} of {agents.length} users
          </div>
          <Button variant="outline" onClick={fetchAgents}>
            Refresh
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AgentManagement;
