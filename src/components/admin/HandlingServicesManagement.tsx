import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  DollarSign,
  Tag,
  MapPin,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface HandlingService {
  id: string;
  service_type: string;
  terminal: string;
  category: string;
  trip_type: string;
  sell_price: number;
  additional: number;
  basic_price: number;
  created_at: string;
  updated_at: string;
}

const HandlingServicesManagement = () => {
  const [services, setServices] = useState<HandlingService[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedService, setSelectedService] =
    useState<HandlingService | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editPrices, setEditPrices] = useState({
    sell_price: 0,
    additional: 0,
    basic_price: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("airport_handling_services")
        .select("*")
        .order("service_type", { ascending: true });

      if (error) {
        console.error("Error fetching handling services:", error);
        toast({
          title: "Error",
          description: "Failed to fetch handling services",
          variant: "destructive",
        });
        return;
      }

      setServices(data || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (service: HandlingService) => {
    setSelectedService(service);
    setEditPrices({
      sell_price: service.sell_price,
      additional: service.additional,
      basic_price: service.basic_price,
    });
    setIsDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedService) return;

    try {
      const { data, error } = await supabase
        .from("airport_handling_services")
        .update({
          sell_price: editPrices.sell_price,
          additional: editPrices.additional,
          basic_price: editPrices.basic_price,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedService.id)
        .select();

      if (error) {
        console.error("Error updating service:", error);
        toast({
          title: "Error",
          description: "Failed to update service prices",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Service prices updated successfully",
      });

      setIsDialogOpen(false);
      fetchServices();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const deleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("airport_handling_services")
        .delete()
        .eq("id", serviceId);

      if (error) {
        console.error("Error deleting service:", error);
        toast({
          title: "Error",
          description: "Failed to delete service",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Service deleted successfully",
      });

      fetchServices();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const filteredServices = services.filter(
    (service) =>
      service.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.terminal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.trip_type.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading handling services...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Handling Services
          </h1>
          <p className="text-muted-foreground">
            Manage airport handling service prices
          </p>
        </div>
        <Button className="bg-primary-tosca hover:bg-primary-dark">
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Service Price Management
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredServices.length === 0 ? (
            <div className="text-center py-8">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No services found</h3>
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No services match your search."
                  : "No handling services available."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Terminal</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Trip Type</TableHead>
                  <TableHead className="text-green-600">Sell Price</TableHead>
                  <TableHead className="text-blue-600">Additional</TableHead>
                  <TableHead className="text-purple-600">Basic Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell>
                      <div className="font-medium">{service.service_type}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        {service.terminal}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{service.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{service.trip_type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-green-600">
                      {formatCurrency(service.sell_price)}
                    </TableCell>
                    <TableCell className="font-medium text-blue-600">
                      {formatCurrency(service.additional)}
                    </TableCell>
                    <TableCell className="font-medium text-purple-600">
                      {formatCurrency(service.basic_price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteService(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Service Prices</DialogTitle>
          </DialogHeader>
          {selectedService && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Service Type</Label>
                  <p className="text-sm">{selectedService.service_type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Terminal</Label>
                  <p className="text-sm">{selectedService.terminal}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm">{selectedService.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Trip Type</Label>
                  <p className="text-sm">{selectedService.trip_type}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="sell_price"
                    className="text-green-600 font-medium"
                  >
                    Sell Price (IDR)
                  </Label>
                  <Input
                    id="sell_price"
                    type="number"
                    value={editPrices.sell_price}
                    onChange={(e) =>
                      setEditPrices({
                        ...editPrices,
                        sell_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-green-200 focus:border-green-400"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="additional"
                    className="text-blue-600 font-medium"
                  >
                    Additional (IDR)
                  </Label>
                  <Input
                    id="additional"
                    type="number"
                    value={editPrices.additional}
                    onChange={(e) =>
                      setEditPrices({
                        ...editPrices,
                        additional: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-blue-200 focus:border-blue-400"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="basic_price"
                    className="text-purple-600 font-medium"
                  >
                    Basic Price (IDR)
                  </Label>
                  <Input
                    id="basic_price"
                    type="number"
                    value={editPrices.basic_price}
                    onChange={(e) =>
                      setEditPrices({
                        ...editPrices,
                        basic_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="border-purple-200 focus:border-purple-400"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveChanges}
                  className="bg-primary-tosca hover:bg-primary-dark"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HandlingServicesManagement;
