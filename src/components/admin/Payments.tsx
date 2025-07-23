import React, { useEffect, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, RefreshCcw, Search } from "lucide-react";

interface Payment {
  id: number;
  booking_id: number | null;
  user_id: string | null;
  user?: { full_name: string } | null;
  amount: number | null;
  payment_method: string | null;
  status: string | null;
  created_at: string | null;
}

const Payments = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setPayments(data as Payment[]);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return "bg-gray-100 text-gray-800";
    switch (status.toLowerCase()) {
      case "completed":
      case "success":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Payment Management1
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-indigo-200 hover:bg-indigo-50 text-indigo-700"
            onClick={fetchPayments}
          >
            <RefreshCcw className="h-4 w-4 mr-2 text-indigo-500" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            <Search className="h-4 w-4 mr-2" />
            Search Payments
          </Button>
        </div>
      </div>

      <Card className="bg-white shadow-md border-0 overflow-hidden rounded-xl mb-6">
        <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 pb-4">
          <CardTitle className="text-lg font-medium text-indigo-700">
            <div className="flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-indigo-500" />
              Payment Transactions
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <Table>
              <TableCaption>A list of all payment transactions</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No payment records found
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.id}
                      </TableCell>
                      <TableCell>{payment.booking_id || "N/A"}</TableCell>
                      <TableCell>
                        {payment.user_id
                          ? payment.user_id.substring(0, 8) + "..."
                          : "N/A"}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell className="capitalize">
                        {payment.payment_method || "N/A"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}
                        >
                          {payment.status || "Unknown"}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(payment.created_at)}</TableCell>
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

export default Payments;
