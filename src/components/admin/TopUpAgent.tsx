import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import {
  Search,
  Loader2,
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Agent {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  saldo: number | null;
  role_name: string | null;
}

interface TopUpTransaction {
  id: string;
  user_id: string | null;
  kode_booking: string;
  nominal: number;
  saldo_akhir: number;
  keterangan: string | null;
  trans_date: string | null;
  agent_name?: string;
  agent_email?: string;
}

const TopUpAgent = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [transactions, setTransactions] = useState<TopUpTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [topUpAmount, setTopUpAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgents();
    fetchTransactions();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(
          `
          id,
          full_name,
          email,
          phone_number,
          saldo,
          roles!fk_users_roles(role_name)
        `,
        )
        .order("full_name", { ascending: true });

      if (error) throw error;

      // Filter for Agent role only
      const agentData =
        data
          ?.map((user: any) => ({
            ...user,
            role_name: user.roles?.role_name || null,
          }))
          .filter((user: any) => user.role_name === "Agent") || [];

      setAgents(agentData);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agents",
        variant: "destructive",
      });
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("histori_transaksi")
        .select(
          `
          *,
          users!histori_transaksi_user_id_fkey(
            full_name,
            email
          )
        `,
        )
        .order("trans_date", { ascending: false })
        .limit(100);

      if (error) throw error;

      const transactionData =
        data?.map((transaction: any) => ({
          ...transaction,
          agent_name: transaction.users?.full_name || "Unknown",
          agent_email: transaction.users?.email || "Unknown",
        })) || [];

      setTransactions(transactionData);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast({
        title: "Error",
        description: "Failed to fetch transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async () => {
    if (!selectedAgent || !topUpAmount || parseFloat(topUpAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please select an agent and enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Get current agent balance
      const { data: agentData, error: agentError } = await supabase
        .from("users")
        .select("saldo, full_name")
        .eq("id", selectedAgent)
        .single();

      if (agentError) throw agentError;

      const currentBalance = agentData.saldo || 0;
      const topUpValue = parseFloat(topUpAmount);
      const newBalance = currentBalance + topUpValue;

      // Update agent balance
      const { error: updateError } = await supabase
        .from("users")
        .update({ saldo: newBalance })
        .eq("id", selectedAgent);

      if (updateError) throw updateError;

      // Create transaction record
      const transactionCode = `TOP${Date.now()}`;
      const { error: transactionError } = await supabase
        .from("histori_transaksi")
        .insert({
          user_id: selectedAgent,
          kode_booking: transactionCode,
          nominal: topUpValue,
          saldo_akhir: newBalance,
          keterangan:
            description ||
            `Top up saldo sebesar Rp ${topUpValue.toLocaleString()}`,
          trans_date: new Date().toISOString(),
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Success",
        description: `Successfully topped up Rp ${topUpValue.toLocaleString()} to ${agentData.full_name}`,
      });

      // Reset form and refresh data
      setSelectedAgent("");
      setTopUpAmount("");
      setDescription("");
      setIsDialogOpen(false);
      fetchAgents();
      fetchTransactions();
    } catch (error) {
      console.error("Error processing top up:", error);
      toast({
        title: "Error",
        description: "Failed to process top up",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAgents = agents.filter(
    (agent) =>
      (agent.full_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (agent.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (agent.phone_number || "").includes(searchTerm),
  );

  const filteredTransactions = transactions.filter(
    (transaction) =>
      (transaction.agent_name?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (transaction.agent_email?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ) ||
      (transaction.kode_booking || "").includes(searchTerm),
  );

  const totalBalance = agents.reduce(
    (sum, agent) => sum + (agent.saldo || 0),
    0,
  );
  const totalTransactions = transactions.length;
  const totalTopUpAmount = transactions
    .filter((t) => t.nominal > 0)
    .reduce((sum, t) => sum + t.nominal, 0);

  return (
    <div className="space-y-6 bg-white">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Top Up Agent</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white">
              <Plus className="h-4 w-4 mr-2" />
              Top Up Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Top Up Agent Balance</DialogTitle>
              <DialogDescription>
                Add balance to an agent's account. This will be recorded in the
                transaction history.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="agent">Select Agent</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {agent.full_name || "No Name"}
                          </span>
                          <span className="text-sm text-gray-500">
                            {agent.email} - Balance: Rp{" "}
                            {(agent.saldo || 0).toLocaleString()}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Top Up Amount (Rp)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  min="1"
                  step="1000"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Enter description for this top up"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleTopUp}
                disabled={submitting}
                className="bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Top Up"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalBalance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all agents</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              All time transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Top Up Amount
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              Rp {totalTopUpAmount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total amount topped up
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agents Balance Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Agent Balances</CardTitle>
              <CardDescription>Current balance for all agents</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Current Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    No agents found
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
                    <TableCell className="text-right font-medium">
                      <span
                        className={`${(agent.saldo || 0) > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        Rp {(agent.saldo || 0).toLocaleString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest top-up transactions for all agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading transactions...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Code</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Final Balance</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm">
                        {transaction.kode_booking}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {transaction.agent_name}
                          </span>
                          <span className="text-sm text-gray-500">
                            {transaction.agent_email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${
                            transaction.nominal > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.nominal > 0 ? "+" : ""}
                          Rp {transaction.nominal.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        Rp {transaction.saldo_akhir.toLocaleString()}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.keterangan
                          ? transaction.keterangan
                              .replace(/ - undefined/gi, " Handling Group")
                              .replace(/undefined/gi, "Handling Group")
                              .trim()
                          : "-"}
                      </TableCell>

                      <TableCell>
                        {transaction.trans_date
                          ? new Date(transaction.trans_date).toLocaleDateString(
                              "id-ID",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TopUpAgent;
