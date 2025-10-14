import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface HistoriTransaksi {
  id: string;
  trans_date: string;
  code_booking: string;
  jenis_transaksi: string;
  saldo_awal: number;
  nominal: number;
  saldo_akhir: number;
  keterangan: string;
  status: string;
}

interface AgentInfo {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  saldo: number;
}

const AgentDetailsPage = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [transactions, setTransactions] = useState<HistoriTransaksi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (agentId) {
      fetchAgentDetails();
    }
  }, [agentId]);

  const fetchAgentDetails = async () => {
    try {
      setLoading(true);

      // Fetch agent info
      const { data: agentData, error: agentError } = await supabase
        .from("users")
        .select("id, full_name, email, phone_number, saldo")
        .eq("id", agentId)
        .single();

      if (agentError) throw agentError;
      setAgentInfo(agentData);

      // Fetch transaction history
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("histori_transaksi")
        .select("*")
        .eq("user_id", agentId)
        .order("trans_date", { ascending: false });

      if (transactionsError) throw transactionsError;
      setTransactions(transactionsData || []);
    } catch (error) {
      console.error("Error fetching agent details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch agent details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }) + 
  " " + 
  date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};


  const getStatusBadgeVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "success":
      case "verified":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const isTopup = (jenisTransaksi?: string | null) => {
  if (!jenisTransaksi) return false; // kalau kosong, langsung false
  
  const topupKeywords = [
    "topup manual agent",
    "top-up",
    "top up",
    "topup agent request", // typo “reqeust” diperbaiki
    "topup driver request",
    "deposit",
  ];

  const normalized = jenisTransaksi.toLowerCase().trim();
  return topupKeywords.some(keyword => normalized.includes(keyword));
};


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <div className="text-lg">Loading agent details...</div>
        </div>
      </div>
    );
  }

  if (!agentInfo) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Agent Not Found</h2>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Agent Transaction History
            </h1>
            <p className="text-muted-foreground">
              Riwayat transaksi untuk {agentInfo.full_name}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchAgentDetails}>
          Refresh
        </Button>
      </div>

      {/* Agent Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{agentInfo.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{agentInfo.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{agentInfo.phone_number || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="font-medium text-green-600">
                {formatCurrency(agentInfo.saldo || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            Riwayat pesanan dan topup ({transactions.length} transaksi)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Belum ada transaksi untuk agent ini.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kode Booking</TableHead>
                  <TableHead>Jenis Transaksi</TableHead>
                  <TableHead className="text-right">Saldo Awal</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-right">Saldo Akhir</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const isTopupTransaction = isTopup(transaction.jenis_transaksi);
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(transaction.trans_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">
                          {transaction.code_booking || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.jenis_transaksi}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(transaction.saldo_awal || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className={`flex items-center justify-end gap-1 font-medium ${
                          isTopupTransaction ? "text-green-600" : "text-red-600"
                        }`}>
                          {isTopupTransaction ? (
                            <>
                              <TrendingUp className="h-4 w-4" />
                              +{formatCurrency(transaction.nominal || 0)}
                            </>
                          ) : (
                            <>
                              <TrendingDown className="h-4 w-4" />
                              -{formatCurrency(transaction.nominal || 0)}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(transaction.saldo_akhir || 0)}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm">
                          {transaction.keterangan || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(transaction.status)}>
                          {transaction.status || "N/A"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AgentDetailsPage;
