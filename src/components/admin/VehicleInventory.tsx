import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import {
  Search,
  FileDown,
  Filter,
  SortAsc,
  SortDesc,
  Plus,
  Edit,
  Trash2,
  Car,
} from "lucide-react";
import { Tables } from "@/types/supabase";
import { useAuth } from "@/contexts/AuthContext";

type Vehicle = Tables<"vehicles">;

const VehicleInventory = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Vehicle | "";
    direction: "asc" | "desc";
  }>({
    key: "",
    direction: "desc",
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("vehicles").select("*");

      if (error) throw error;

      setVehicles(data || []);
      setFilteredVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setFilteredVehicles(vehicles);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = vehicles.filter(
      (vehicle) =>
        vehicle.make?.toLowerCase().includes(query) ||
        vehicle.model?.toLowerCase().includes(query) ||
        vehicle.license_plate?.toLowerCase().includes(query) ||
        vehicle.name?.toLowerCase().includes(query),
    );

    setFilteredVehicles(filtered);
  };

  const handleSort = (key: keyof Vehicle) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }

    setSortConfig({ key, direction });

    const sortedVehicles = [...filteredVehicles].sort((a, b) => {
      if (!a[key] && !b[key]) return 0;
      if (!a[key]) return 1;
      if (!b[key]) return -1;

      const aValue = a[key];
      const bValue = b[key];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return direction === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // For numbers and other types
      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredVehicles(sortedVehicles);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">
                Vehicle Inventory
              </CardTitle>
              <CardDescription>
                Manage all vehicles in your fleet
              </CardDescription>
            </div>
            <Button className="bg-gradient-to-r from-primary-tosca to-primary-dark hover:from-primary-dark hover:to-primary-tosca text-white">
              <Plus className="mr-2 h-4 w-4" /> Add New Vehicle
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by make, model, or license plate..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button variant="outline" onClick={handleSearch}>
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
            <Button variant="outline">
              <FileDown className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-tosca"></div>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 font-medium">
                      <th className="py-3 px-4 text-left">
                        <div
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => handleSort("name")}
                        >
                          Vehicle
                          {sortConfig.key === "name" &&
                            (sortConfig.direction === "asc" ? (
                              <SortAsc className="h-4 w-4" />
                            ) : (
                              <SortDesc className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left">
                        <div
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => handleSort("make")}
                        >
                          Make/Model
                          {sortConfig.key === "make" &&
                            (sortConfig.direction === "asc" ? (
                              <SortAsc className="h-4 w-4" />
                            ) : (
                              <SortDesc className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left">
                        <div
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => handleSort("license_plate")}
                        >
                          License Plate
                          {sortConfig.key === "license_plate" &&
                            (sortConfig.direction === "asc" ? (
                              <SortAsc className="h-4 w-4" />
                            ) : (
                              <SortDesc className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left">
                        <div
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => handleSort("price")}
                        >
                          Daily Rate
                          {sortConfig.key === "price" &&
                            (sortConfig.direction === "asc" ? (
                              <SortAsc className="h-4 w-4" />
                            ) : (
                              <SortDesc className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-left">
                        <div
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={() => handleSort("status")}
                        >
                          Status
                          {sortConfig.key === "status" &&
                            (sortConfig.direction === "asc" ? (
                              <SortAsc className="h-4 w-4" />
                            ) : (
                              <SortDesc className="h-4 w-4" />
                            ))}
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVehicles.length > 0 ? (
                      filteredVehicles.map((vehicle) => (
                        <tr
                          key={vehicle.id}
                          className="border-b hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                                <Car className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-medium">
                                  {vehicle.name ||
                                    `${vehicle.make} ${vehicle.model}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {vehicle.year}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {vehicle.make} {vehicle.model}
                          </td>
                          <td className="py-3 px-4">{vehicle.license_plate}</td>
                          <td className="py-3 px-4">
                            {formatCurrency(vehicle.price)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                vehicle.status === "Available" ||
                                vehicle.status === "available"
                                  ? "bg-green-100 text-green-800"
                                  : vehicle.status === "Maintenance"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : vehicle.status === "Booked" ||
                                        vehicle.status === "booked"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-red-100 text-red-800"
                              }`}
                            >
                              {vehicle.status || "Unknown"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-center gap-2">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              {userRole === "Super Admin" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 text-center text-muted-foreground"
                        >
                          No vehicles found matching the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleInventory;
