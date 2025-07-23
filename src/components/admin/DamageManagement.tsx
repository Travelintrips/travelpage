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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import {
  Search,
  X,
  Eye,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  ListChecks,
  CreditCard,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Damage {
  id: number;
  booking_id: number;
  vehicle_id: number;
  description: string;
  severity: string;
  status: string;
  repair_cost: number;
  created_at: string;
  updated_at: string;
  images?: string[];
  payment_status?: string;
  payment_id?: string | null;
  booking?: {
    id: number;
    user_id: string;
    user?: {
      full_name: string;
    };
  };
}

interface DamageChecklist {
  id: number;
  item_name: string;
  damage_value: number;
  category: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function DamageManagement() {
  const [damages, setDamages] = useState<Damage[]>([]);
  const [filteredDamages, setFilteredDamages] = useState<Damage[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentDamage, setCurrentDamage] = useState<Damage | null>(null);
  const [activeTab, setActiveTab] = useState<string>("damages");

  // Checklist state
  const [checklistItems, setChecklistItems] = useState<DamageChecklist[]>([]);
  const [filteredChecklistItems, setFilteredChecklistItems] = useState<
    DamageChecklist[]
  >([]);
  const [checklistSearchTerm, setChecklistSearchTerm] = useState<string>("");
  const [isChecklistLoading, setIsChecklistLoading] = useState(true);
  const [isChecklistFormOpen, setIsChecklistFormOpen] = useState(false);
  const [currentChecklistItem, setCurrentChecklistItem] =
    useState<DamageChecklist | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    item_name: "",
    damage_value: 0,
    category: "",
    description: "",
  });

  const { toast } = useToast();

  useEffect(() => {
    if (activeTab === "damages") {
      fetchDamages();
    } else if (activeTab === "checklist") {
      fetchChecklistItems();
    }
  }, [activeTab]);

  const fetchDamages = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("damages")
        .select(
          `
          *,
          booking:bookings(id, user_id, user:users(full_name))
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDamages(data || []);
      setFilteredDamages(data || []);
    } catch (error) {
      console.error("Error fetching damages:", error);
      toast({
        variant: "destructive",
        title: "Error fetching damages",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChecklistItems = async () => {
    try {
      setIsChecklistLoading(true);
      const { data, error } = await supabase
        .from("checklist_items")
        .select("*")
        .order("category", { ascending: true })
        .order("item_name", { ascending: true });

      if (error) throw error;
      setChecklistItems(data || []);
      setFilteredChecklistItems(data || []);
    } catch (error) {
      console.error("Error fetching checklist items:", error);
      toast({
        variant: "destructive",
        title: "Error fetching checklist items",
        description: error.message,
      });
    } finally {
      setIsChecklistLoading(false);
    }
  };

  const handleChecklistSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setChecklistSearchTerm(e.target.value);
  };

  const clearChecklistSearch = () => {
    setChecklistSearchTerm("");
    setFilteredChecklistItems(checklistItems);
  };

  useEffect(() => {
    if (checklistSearchTerm.trim() === "") {
      setFilteredChecklistItems(checklistItems);
      return;
    }

    const lowercasedSearch = checklistSearchTerm.toLowerCase();
    const filtered = checklistItems.filter(
      (item) =>
        item.item_name?.toLowerCase().includes(lowercasedSearch) ||
        item.category?.toLowerCase().includes(lowercasedSearch) ||
        item.description?.toLowerCase().includes(lowercasedSearch) ||
        item.damage_value.toString().includes(lowercasedSearch),
    );

    setFilteredChecklistItems(filtered);
  }, [checklistSearchTerm, checklistItems]);

  const openAddChecklistItemForm = () => {
    setCurrentChecklistItem(null);
    setFormData({
      item_name: "",
      damage_value: 0,
      category: "",
      description: "",
    });
    setIsChecklistFormOpen(true);
  };

  const openEditChecklistItemForm = (item: DamageChecklist) => {
    setCurrentChecklistItem(item);
    setFormData({
      item_name: item.item_name,
      damage_value: item.damage_value,
      category: item.category || "",
      description: item.description || "",
    });
    setIsChecklistFormOpen(true);
  };

  const openDeleteConfirmation = (item: DamageChecklist) => {
    setCurrentChecklistItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "damage_value" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSaveChecklistItem = async () => {
    try {
      if (!formData.item_name) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Item name is required",
        });
        return;
      }

      if (formData.damage_value <= 0) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Damage value must be greater than 0",
        });
        return;
      }

      if (currentChecklistItem) {
        // Update existing item
        const { error } = await supabase
          .from("checklist_items")
          .update({
            item_name: formData.item_name,
            damage_value: formData.damage_value,
            category: formData.category || null,
            description: formData.description || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", currentChecklistItem.id);

        if (error) throw error;

        toast({
          title: "Item Updated",
          description: "Damage checklist item has been updated successfully",
        });
      } else {
        // Add new item
        const { error } = await supabase.from("checklist_items").insert({
          item_name: formData.item_name,
          damage_value: formData.damage_value,
          category: formData.category || null,
          description: formData.description || null,
        });

        if (error) throw error;

        toast({
          title: "Item Added",
          description: "New damage checklist item has been added successfully",
        });
      }

      setIsChecklistFormOpen(false);
      fetchChecklistItems();
    } catch (error) {
      console.error("Error saving checklist item:", error);
      toast({
        variant: "destructive",
        title: "Error saving item",
        description: error.message,
      });
    }
  };

  const handleDeleteChecklistItem = async () => {
    try {
      if (!currentChecklistItem) return;

      const { error } = await supabase
        .from("checklist_items")
        .delete()
        .eq("id", currentChecklistItem.id);

      if (error) throw error;

      toast({
        title: "Item Deleted",
        description: "Damage checklist item has been deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      fetchChecklistItems();
    } catch (error) {
      console.error("Error deleting checklist item:", error);
      toast({
        variant: "destructive",
        title: "Error deleting item",
        description: error.message,
      });
    }
  };

  const handleViewDetails = (damage: Damage) => {
    setCurrentDamage(damage);
    setIsDetailsOpen(true);
  };

  const getSeverityBadge = (severity: string) => {
    if (!severity) return <Badge variant="outline">Unknown</Badge>;
    switch (severity.toLowerCase()) {
      case "minor":
        return <Badge className="bg-yellow-500">Minor</Badge>;
      case "moderate":
        return <Badge className="bg-orange-500">Moderate</Badge>;
      case "severe":
        return <Badge className="bg-red-500">Severe</Badge>;
      default:
        return <Badge>{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    switch (status.toLowerCase()) {
      case "reported":
        return <Badge className="bg-blue-500">Reported</Badge>;
      case "assessed":
        return <Badge className="bg-purple-500">Assessed</Badge>;
      case "repairing":
        return <Badge className="bg-orange-500">Repairing</Badge>;
      case "repaired":
        return <Badge className="bg-green-500">Repaired</Badge>;
      case "billed":
        return <Badge className="bg-pink-500">Billed</Badge>;
      case "paid":
        return <Badge className="bg-green-700">Paid</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDamages(damages);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();
    const filtered = damages.filter(
      (damage) =>
        damage.description?.toLowerCase().includes(lowercasedSearch) ||
        damage.severity?.toLowerCase().includes(lowercasedSearch) ||
        damage.status?.toLowerCase().includes(lowercasedSearch) ||
        damage.booking?.user?.full_name
          ?.toLowerCase()
          .includes(lowercasedSearch) ||
        damage.id.toString().includes(lowercasedSearch) ||
        damage.booking_id.toString().includes(lowercasedSearch) ||
        damage.vehicle_id.toString().includes(lowercasedSearch),
    );

    setFilteredDamages(filtered);
  }, [searchTerm, damages]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredDamages(damages);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Damage Management</h2>
        <div className="flex space-x-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="damages">Damage Reports</TabsTrigger>
              <TabsTrigger value="checklist">Damage Checklist</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {activeTab === "damages" && (
        <div className="relative w-64 mb-6">
          <div className="relative flex items-center">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search damages..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {filteredDamages.length !== damages.length && (
            <div className="absolute right-0 -bottom-6 text-xs text-gray-500">
              Found {filteredDamages.length} of {damages.length} damages
            </div>
          )}
        </div>
      )}

      {activeTab === "checklist" && (
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-64">
            <div className="relative flex items-center">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search checklist..."
                value={checklistSearchTerm}
                onChange={handleChecklistSearchChange}
                className="w-full pl-10 pr-10 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {checklistSearchTerm && (
                <button
                  onClick={clearChecklistSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {filteredChecklistItems.length !== checklistItems.length && (
              <div className="absolute right-0 -bottom-6 text-xs text-gray-500">
                Found {filteredChecklistItems.length} of {checklistItems.length}{" "}
                items
              </div>
            )}
          </div>
          <Button onClick={() => openAddChecklistItemForm()}>
            <Plus className="h-4 w-4 mr-2" /> Add Damage Item
          </Button>
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        <div className="flex space-x-2">
          <select
            className="p-2 border rounded-md"
            onChange={(e) => {
              const status = e.target.value;
              if (status === "All Status") {
                setFilteredDamages(damages);
              } else {
                const filtered = damages.filter(
                  (damage) =>
                    damage.status.toLowerCase() === status.toLowerCase(),
                );
                setFilteredDamages(filtered);
              }
            }}
          >
            <option>All Status</option>
            <option>Reported</option>
            <option>Assessed</option>
            <option>Repairing</option>
            <option>Repaired</option>
            <option>Billed</option>
            <option>Paid</option>
          </select>

          <select
            className="p-2 border rounded-md"
            onChange={(e) => {
              const severity = e.target.value;
              if (severity === "All Severity") {
                setFilteredDamages(damages);
              } else {
                const filtered = damages.filter(
                  (damage) =>
                    damage.severity.toLowerCase() === severity.toLowerCase(),
                );
                setFilteredDamages(filtered);
              }
            }}
          >
            <option>All Severity</option>
            <option>Minor</option>
            <option>Moderate</option>
            <option>Severe</option>
          </select>
        </div>
      </div>

      {activeTab === "damages" && (
        <>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading damages...</p>
            </div>
          ) : filteredDamages.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-xl font-medium text-gray-600 mb-2">
                No damages found
              </p>
              <p className="text-gray-500">
                {searchTerm
                  ? "Try adjusting your search criteria"
                  : "There are no damage reports in the system yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableCaption>
                List of all vehicle damages in the system
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Repair Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDamages.map((damage) => (
                  <TableRow key={damage.id}>
                    <TableCell>{damage.id}</TableCell>
                    <TableCell>#{damage.booking_id}</TableCell>
                    <TableCell>Vehicle #{damage.vehicle_id}</TableCell>
                    <TableCell>
                      {damage.booking?.user?.full_name || "Unknown"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {damage.description}
                    </TableCell>
                    <TableCell>{getSeverityBadge(damage.severity)}</TableCell>
                    <TableCell>
                      {formatCurrency(damage.repair_cost || 0)}
                    </TableCell>
                    <TableCell>{getStatusBadge(damage.status)}</TableCell>
                    <TableCell>{formatDate(damage.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(damage)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      {activeTab === "checklist" && (
        <>
          {isChecklistLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading checklist items...</p>
            </div>
          ) : filteredChecklistItems.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-xl font-medium text-gray-600 mb-2">
                No checklist items found
              </p>
              <p className="text-gray-500">
                {checklistSearchTerm
                  ? "Try adjusting your search criteria"
                  : "There are no damage checklist items in the system yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableCaption>List of all damage checklist items</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Damage Value</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredChecklistItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {item.category || "Uncategorized"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(item.damage_value)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {item.description || "No description"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditChecklistItemForm(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteConfirmation(item)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      {/* Damage Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Damage Details</DialogTitle>
            <DialogDescription>
              Detailed information about the damage report
            </DialogDescription>
          </DialogHeader>
          {currentDamage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">General Information</h3>
                  <p>
                    <span className="font-medium">Damage ID:</span>{" "}
                    {currentDamage.id}
                  </p>
                  <p>
                    <span className="font-medium">Booking ID:</span> #
                    {currentDamage.booking_id}
                  </p>
                  <p>
                    <span className="font-medium">Vehicle ID:</span> #
                    {currentDamage.vehicle_id}
                  </p>
                  <p>
                    <span className="font-medium">Customer:</span>{" "}
                    {currentDamage.booking?.user?.full_name || "Unknown"}
                  </p>
                  <p>
                    <span className="font-medium">Reported Date:</span>{" "}
                    {formatDate(currentDamage.created_at)}
                  </p>
                  {currentDamage.updated_at && (
                    <p>
                      <span className="font-medium">Last Updated:</span>{" "}
                      {formatDate(currentDamage.updated_at)}
                    </p>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-semibold">Damage Details</h3>
                  <p>
                    <span className="font-medium">Severity:</span>{" "}
                    {getSeverityBadge(currentDamage.severity)}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {getStatusBadge(currentDamage.status)}
                  </p>
                  <p>
                    <span className="font-medium">Repair Cost:</span>{" "}
                    {formatCurrency(currentDamage.repair_cost || 0)}
                  </p>
                  <div className="mt-2">
                    <span className="font-medium">Description:</span>
                    <p className="mt-1 text-sm whitespace-pre-wrap">
                      {currentDamage.description}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Damage Images</h3>
                {currentDamage.images && currentDamage.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {currentDamage.images.map((image, index) => (
                      <div
                        key={index}
                        className="relative aspect-video overflow-hidden rounded-md border"
                      >
                        <img
                          src={image}
                          alt={`Damage ${index + 1}`}
                          className="object-cover w-full h-full"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No images available</p>
                )}

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">
                      Update Status
                    </Button>
                    <Button variant="outline" size="sm">
                      Edit Details
                    </Button>
                    <Button variant="outline" size="sm">
                      Generate Invoice
                    </Button>
                    <Button variant="outline" size="sm">
                      <ListChecks className="h-4 w-4 mr-2" /> Apply Checklist
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Checklist Item Form Dialog */}
      <Dialog open={isChecklistFormOpen} onOpenChange={setIsChecklistFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentChecklistItem
                ? "Edit Damage Item"
                : "Add New Damage Item"}
            </DialogTitle>
            <DialogDescription>
              {currentChecklistItem
                ? "Update the details of this damage checklist item"
                : "Add a new item to the damage checklist"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="item_name" className="text-right">
                Item Name
              </Label>
              <Input
                id="item_name"
                name="item_name"
                value={formData.item_name}
                onChange={handleFormChange}
                className="col-span-3"
                placeholder="e.g. Kaca depan pecah"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Input
                id="category"
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                className="col-span-3"
                placeholder="e.g. Kaca, Body, Ban, etc."
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="damage_value" className="text-right">
                Damage Value (Rp)
              </Label>
              <Input
                id="damage_value"
                name="damage_value"
                type="number"
                value={formData.damage_value}
                onChange={handleFormChange}
                className="col-span-3"
                placeholder="e.g. 500000"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                className="col-span-3"
                placeholder="Detailed description of the damage"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChecklistFormOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChecklistItem}>
              {currentChecklistItem ? "Update" : "Add"} Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this damage checklist item? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {currentChecklistItem && (
            <div className="py-4">
              <p>
                <span className="font-medium">Item:</span>{" "}
                {currentChecklistItem.item_name}
              </p>
              <p>
                <span className="font-medium">Damage Value:</span>{" "}
                {formatCurrency(currentChecklistItem.damage_value)}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteChecklistItem}>
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
