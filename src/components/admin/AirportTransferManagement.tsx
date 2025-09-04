import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { Search, RefreshCw, FileDown, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";


interface AirportTransfer {
  id: number;
  customer_name: string;
  phone: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_date: string;
  pickup_time: string;
  price: number;
  status: string;
  payment_method: string;
  payment_status: string;
  driver_id: string | null;
  driver_name?: string;
}

interface Driver {
  id: string;
  id_driver?: number;
  name: string;
  status: string;
}

const AirportTransferManagement = () => {
  const [transfers, setTransfers] = useState<AirportTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTransfers, setFilteredTransfers] = useState<AirportTransfer[]>(
    [],
  );
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverSearchQuery, setDriverSearchQuery] = useState("");
  const [showDriverSearch, setShowDriverSearch] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedDriverName, setSelectedDriverName] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();
  const { userRole } = useAuth();

  useEffect(() => {
    fetchTransfers();
    fetchDrivers();
  }, []);

  const fetchTransfers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("airport_transfer")
        .select("*")
        .order("id", { ascending: false });

      if (error) throw error;

      if (data) {
        setTransfers(data);
        setFilteredTransfers(data);
      }
    } catch (error) {
      console.error("Error fetching airport transfers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, id_driver, name, status");

      if (error) throw error;

      if (data) {
        setDrivers(data);
      }
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  useEffect(() => {
    if (searchQuery) {
      const filtered = transfers.filter(
        (transfer) =>
          transfer.customer_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          transfer.pickup_location
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          transfer.dropoff_location
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          transfer.id.toString().includes(searchQuery),
      );
      setFilteredTransfers(filtered);
    } else {
      setFilteredTransfers(transfers);
    }
  }, [searchQuery, transfers]);

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.id.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
      driver.name.toLowerCase().includes(driverSearchQuery.toLowerCase()),
  );

  const handleDriverSelect = (
    driverId: string,
    driverName: string,
    transferId: number,
  ) => {
    setSelectedDriverId(driverId);
    setSelectedDriverName(driverName);
    setShowDriverSearch(null);
  };

  const handleProcessTransfer = async (
    transferId: number,
    driverId?: string,
  ) => {
    try {
      let selectedDriver;

      console.log("🟡 Proses assign driver dimulai...");
      console.log("Transfer ID:", transferId, "| Driver ID param:", driverId);

      if (driverId) {
        const { data, error } = await supabase
          .from("drivers")
          .select("id, id_driver, name, status")
          .eq("id", driverId)
          .single();
        if (error) throw error;
        if (!data) {
          alert(`Driver with ID ${driverId} not found!`);
          return;
        }
        selectedDriver = data;
      } else {
        const { data: availableDrivers, error } = await supabase
          .from("drivers")
          .select("id, id_driver, name, status")
          .eq("status", "available")
          .limit(1);
        if (error) throw error;
        if (!availableDrivers?.length) {
          alert("No available drivers found!");
          return;
        }
        selectedDriver = availableDrivers[0];
      }

      console.log("✅ Selected Driver:", selectedDriver);

      // Step 1: Force update to NULL to trigger distinct
      await supabase
        .from("airport_transfer")
        .update({ driver_id: null })
        .eq("id", transferId);

      // Step 2: Real update with selected driver
      const { error: updateError } = await supabase
        .from("airport_transfer")
        .update({ driver_id: selectedDriver.id, status: "pending" })
        .eq("id", transferId);
      if (updateError) throw updateError;

      await supabase
        .from("drivers")
        .update({ status: "busy" })
        .eq("id", selectedDriver.id);

      // Step 3: Create notification in airport_transfer_notifications table
      // Step 3: Create notification if not exists
      const { data: existingNotification } = await supabase
        .from("airport_transfer_notifications")
        .select("id")
        .eq("transfer_id", transferId)
        .eq("driver_id", selectedDriver.id)
        .maybeSingle();

      if (!existingNotification) {
        const { error: notificationError } = await supabase
          .from("airport_transfer_notifications")
          .insert([
            {
              transfer_id: transferId,
              driver_id: selectedDriver.id,
              status: "assigned",
              message: `Transfer #${transferId} has been assigned to driver ${selectedDriver.name}`,
              created_at: new Date().toISOString(),
            },
          ]);

        if (notificationError) {
          console.error("Error creating notification:", notificationError);
        }
      }

      // Update the local transfers array with the driver name
      setTransfers((prevTransfers) =>
        prevTransfers.map((t) =>
          t.id === transferId
            ? {
                ...t,
                driver_id: selectedDriver.id,
                driver_name: selectedDriver.name,
              }
            : t,
        ),
      );

      setFilteredTransfers((prevFiltered) =>
        prevFiltered.map((t) =>
          t.id === transferId
            ? {
                ...t,
                driver_id: selectedDriver.id,
                driver_name: selectedDriver.name,
              }
            : t,
        ),
      );

      alert(
        `Transfer #${transferId} has been assigned to driver ${selectedDriver.name} (ID: ${selectedDriver.id_driver ?? selectedDriver.id})`,
      );

      setShowDriverSearch(null);
      setDriverSearchQuery("");
      await fetchTransfers();
      await fetchDrivers();
    } catch (error) {
      console.error("❌ Error assigning driver:", error);
      alert("Failed to assign driver. Please try again.");
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">
                Airport Transfer Management
              </CardTitle>
              <CardDescription>
                Manage all airport transfer bookings
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transfers..."
                  className="pl-8 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchTransfers}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                title="Export"
                onClick={() => {
                  // Export functionality
                  const csvContent = [
                    [
                      "ID",
                      "Customer Name",
                      "Pickup Location",
                      "Dropoff Location",
                      "Date",
                      "Time",
                      "Passengers",
                      "Price",
                      "Status",
                      "Payment Method",
                      "Payment Status",
                      "Driver ID",
                    ],
                    ...filteredTransfers.map((t) => [
                      t.id,
                      t.customer_name,
                      t.pickup_location,
                      t.dropoff_location,
                      t.pickup_date,
                      t.pickup_time,
                      "1", // Default passenger count
                      t.price,
                      t.status || "pending",
                      t.payment_method || "cash",
                      t.payment_status || "pending",
                      t.driver_id || "",
                    ]),
                  ]
                    .map((row) => row.join(","))
                    .join("\n");

                  const blob = new Blob([csvContent], { type: "text/csv" });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.setAttribute("hidden", "");
                  a.setAttribute("href", url);
                  a.setAttribute("download", "airport_transfers.csv");
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }}
              >
                <FileDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="py-3 px-4 text-left font-medium">ID</th>
                    <th className="py-3 px-4 text-left font-medium">
                      Customer Name
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Pickup Location
                    </th>
                    <th className="py-3 px-4 text-left font-medium">
                      Dropoff Location
                    </th>
                    <th className="py-3 px-4 text-left font-medium">Date</th>
                    <th className="py-3 px-4 text-left font-medium">Time</th>
                    <th className="py-3 px-4 text-left font-medium">
                      Passengers
                    </th>
                    <th className="py-3 px-4 text-left font-medium">Price</th>
                    <th className="py-3 px-4 text-left font-medium">Status</th>
                    <th className="py-3 px-4 text-left font-medium">
                      Payment Method
                    </th>
                    <th className="py-3 px-4 text-left font-medium">Payment</th>
                    <th className="py-3 px-4 text-left font-medium">
                      Driver ID
                    </th>
                    {userRole !== "Staff" && (
                      <th className="py-3 px-4 text-left font-medium">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={userRole !== "Staff" ? 14 : 13} className="py-6 text-center">
                        Loading transfers...
                      </td>
                    </tr>
                  ) : filteredTransfers.length > 0 ? (
                    filteredTransfers.map((transfer) => (
                      <tr
                        key={transfer.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">{transfer.id}</td>
                        <td className="py-3 px-4">{transfer.customer_name}</td>
                        <td className="py-3 px-4">
                          {transfer.pickup_location}
                        </td>
                        <td className="py-3 px-4">
                          {transfer.dropoff_location}
                        </td>
                        <td className="py-3 px-4">{transfer.pickup_date}</td>
                        <td className="py-3 px-4">{transfer.pickup_time}</td>
                        <td className="py-3 px-4">1</td>
                        <td className="py-3 px-4">
                          Rp {transfer.price?.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              transfer.status === "completed" ||
                              transfer.status === "confirmed"
                                ? "bg-green-100 text-green-800"
                                : transfer.status === "assigned"
                                  ? "bg-blue-100 text-blue-800"
                                  : transfer.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {transfer.status || "pending"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {transfer.payment_method || "cash"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              transfer.payment_status === "paid"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {transfer.payment_status || "pending"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {showDriverSearch === transfer.id ? (
                            <div className="flex flex-col space-y-2">
                              <div className="flex space-x-2">
                                <Input
                                  placeholder="Search driver ID..."
                                  value={driverSearchQuery}
                                  onChange={(e) =>
                                    setDriverSearchQuery(e.target.value)
                                  }
                                  className="w-40"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowDriverSearch(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              {filteredDrivers.length > 0 && (
                                <div className="bg-white border rounded-md shadow-sm max-h-32 overflow-y-auto">
                                  {filteredDrivers.map((driver) => (
                                    <div
                                      key={driver.id}
                                      className="px-2 py-1 hover:bg-muted cursor-pointer text-xs"
                                      onClick={() =>
                                        handleDriverSelect(
                                          driver.id,
                                          driver.name,
                                          transfer.id,
                                        )
                                      }
                                    >
                                      <span className="text-sm text-muted-foreground">
                                        {driver.id_driver
                                          ? `${driver.id_driver} - `
                                          : ""}
                                        {driver.name}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            (() => {
                              const matchedDriver = drivers.find(
                                (d) => d.id === transfer.driver_id,
                              );
                              return matchedDriver?.id_driver
                                ? `${matchedDriver.id_driver}`
                                : transfer.driver_id || "-";
                            })()
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {(() => {
                            // If this transfer has a driver_name directly, use it
                            if (transfer.driver_name) {
                              return transfer.driver_name;
                            }
                            // If this transfer has a driver assigned but no name, find and display the driver name
                            else if (transfer.driver_id) {
                              const assignedDriver = drivers.find(
                                (d) => d.id === transfer.driver_id,
                              );
                              return assignedDriver ? assignedDriver.name : "-";
                            }
                            // If we're in driver selection mode for this transfer, show nothing
                            else if (showDriverSearch === transfer.id) {
                              return "-";
                            }
                            // Otherwise show the selected driver name if applicable
                            else {
                              return selectedDriverId &&
                                selectedDriverName &&
                                showDriverSearch === null
                                ? selectedDriverName
                                : "-";
                            }
                          })()}
                        </td>
                        {userRole !== "Staff" && (
                          <td className="py-3 px-4">
                            {!transfer.driver_id &&
                              transfer.status !== "cancelled" && (
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setShowDriverSearch(transfer.id)
                                    }
                                  >
                                    Select Driver
                                  </Button>
                                  {selectedDriverId &&
                                    showDriverSearch === null && (
                                      <Button
                                        size="sm"
                                        variant="default"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() =>
                                          handleProcessTransfer(
                                            transfer.id,
                                            selectedDriverId,
                                          )
                                        }
                                      >
                                        Assign Driver
                                      </Button>
                                    )}
                                </div>
                              )}
                            {transfer.driver_id && (
                              <div className="flex items-center gap-1">
                                <Check className="h-4 w-4 text-green-600" />
                                <span className="text-xs">Assigned</span>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={userRole !== "Staff" ? 14 : 13}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No airport transfers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {filteredTransfers.length} of {transfers.length} transfers
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AirportTransferManagement;