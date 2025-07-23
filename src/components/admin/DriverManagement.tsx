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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import {
  UserCog,
  Pencil,
  Trash2,
  Plus,
  Search,
  Loader2,
  Upload,
  Camera,
} from "lucide-react";

interface Driver {
  id: string;
  created_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  license_number: string | null;
  license_expiry: string | null;
  account_status: string | null;
  selfie_url: string | null;
  sim_url: string | null;
  stnk_url: string | null;
  kk_url: string | null;
  stnk_expiry: string | null;
  reference_phone: string | null;
  is_online: boolean | null;
}

const DriverManagement = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    license_number: "",
    license_expiry: "",
    account_status: "active",
    selfie_url: "",
    sim_url: "",
    stnk_url: "",
    kk_url: "",
    stnk_expiry: "",
    reference_phone: "",
    role_id: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadLoading, setUploadLoading] = useState({
    selfie: false,
    sim: false,
    stnk: false,
    kk: false,
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      console.log("Fetching drivers...");

      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching drivers:", error);
        throw error;
      }

      console.log("Fetched drivers:", data);
      setDrivers(data || []);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching drivers:", error);
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    fileType: "selfie" | "sim" | "stnk" | "kk",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Set loading state for specific file type
      setUploadLoading((prev) => ({ ...prev, [fileType]: true }));

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${fileType}_${Date.now()}.${fileExt}`;
      const filePath = `drivers/${fileType}/${fileName}`;

      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from("drivers")
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("drivers")
        .getPublicUrl(filePath);

      // Update form data with the file URL
      setFormData({
        ...formData,
        [`${fileType}_url`]: urlData.publicUrl,
      });
    } catch (error) {
      console.error(`Error uploading ${fileType}:`, error);
    } finally {
      setUploadLoading((prev) => ({ ...prev, [fileType]: false }));
    }
  };

  const handleAddDriver = async () => {
    try {
      const { data, error } = await supabase
        .from("drivers")
        .insert([formData])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setDrivers([data[0], ...drivers]);
      }

      setIsAddDialogOpen(false);
      setFormData({
        name: "",
        email: "",
        phone: "",
        license_number: "",
        license_expiry: "",
        account_status: "active",
        selfie_url: "",
        sim_url: "",
        stnk_url: "",
        kk_url: "",
        stnk_expiry: "",
        reference_phone: "",
        role_id: null,
      });
    } catch (error) {
      console.error("Error adding driver:", error);
    }
  };

  const handleEditDriver = async () => {
    if (!selectedDriver) return;

    try {
      setIsSubmitting(true);
      console.log("Updating driver with data:", formData);

      // Create a clean object with only the fields that have values
      const cleanedFormData = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value !== ""),
      );

      console.log("Cleaned form data:", cleanedFormData);

      // First update in Supabase
      const { data, error } = await supabase
        .from("drivers")
        .update(cleanedFormData)
        .eq("id", selectedDriver.id)
        .select();

      if (error) {
        console.error("Supabase update error:", error);
        throw error;
      }

      console.log("Update response:", data);

      // Then send webhook notification using fetch API
      try {
        const response = await fetch(
          "https://script.google.com/u/0/home/projects/1_W_OfEJ43eTHjqi-ONeA1omY2ZtJa1d4co-mMzj6qIkUJG7i1O2npSQC/edit",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              ...cleanedFormData,
              id: selectedDriver.id,
              event_type: "driver.updated",
            }),
          },
        );

        if (response.ok) {
          const webhookData = await response.json();
          console.log("Webhook notification sent successfully:", webhookData);
        } else {
          console.error(
            "Error sending webhook notification:",
            await response.text(),
          );
        }
      } catch (webhookError) {
        console.error("Failed to send webhook notification:", webhookError);
        // Continue with the process even if webhook fails
      }

      if (data && data.length > 0) {
        const updatedDrivers = drivers.map((driver) =>
          driver.id === selectedDriver.id ? data[0] : driver,
        );
        setDrivers(updatedDrivers);
        console.log("Driver updated successfully");
      } else {
        // Fallback to local update if no data returned
        const updatedDrivers = drivers.map((driver) =>
          driver.id === selectedDriver.id
            ? { ...driver, ...cleanedFormData }
            : driver,
        );
        setDrivers(updatedDrivers);
        console.log("Driver updated locally (no data returned from server)");
      }

      setIsEditDialogOpen(false);
      setSelectedDriver(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        license_number: "",
        license_expiry: "",
        account_status: "active",
        selfie_url: "",
        sim_url: "",
        stnk_url: "",
        kk_url: "",
        stnk_expiry: "",
        reference_phone: "",
        role_id: cleanedFormData.role_id || null,
      });

      // Refresh the drivers list to ensure we have the latest data
      fetchDrivers();
    } catch (error) {
      console.error("Error updating driver:", error);
      alert("Failed to update driver: " + (error.message || "Unknown error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!selectedDriver) return;

    try {
      const { error } = await supabase
        .from("drivers")
        .delete()
        .eq("id", selectedDriver.id);

      if (error) throw error;

      const filteredDrivers = drivers.filter(
        (driver) => driver.id !== selectedDriver.id,
      );

      setDrivers(filteredDrivers);
      setIsDeleteDialogOpen(false);
      setSelectedDriver(null);
    } catch (error) {
      console.error("Error deleting driver:", error);
    }
  };

  const openEditDialog = (driver: Driver) => {
    console.log("Opening edit dialog for driver:", driver);
    setSelectedDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email || "",
      phone: driver.phone || "",
      license_number: driver.license_number || "",
      license_expiry: driver.license_expiry || "",
      account_status: driver.account_status || "active",
      selfie_url: driver.selfie_url || "",
      sim_url: driver.sim_url || "",
      stnk_url: driver.stnk_url || "",
      kk_url: driver.kk_url || "",
      stnk_expiry: driver.stnk_expiry || "",
      reference_phone: driver.reference_phone || "",
      role_id: null,
    });
    setIsSubmitting(false);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDeleteDialogOpen(true);
  };

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (driver.phone || "").includes(searchTerm) ||
      (driver.license_number?.toLowerCase() || "").includes(
        searchTerm.toLowerCase(),
      ),
  );

  const FileUploadField = ({
    label,
    id,
    fileType,
    accept = "image/*",
  }: {
    label: string;
    id: string;
    fileType: "selfie" | "sim" | "stnk" | "kk";
    accept?: string;
  }) => (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label htmlFor={id} className="text-right">
        {label}
      </Label>
      <div className="col-span-3 flex items-center gap-2">
        <Input
          id={id}
          name={`${fileType}_url`}
          value={formData[`${fileType}_url` as keyof typeof formData] as string}
          onChange={handleInputChange}
          className="flex-1"
          placeholder={`Enter ${label} URL or upload`}
        />
        <div className="relative">
          <Input
            type="file"
            accept={accept}
            id={`${id}-upload`}
            className="absolute inset-0 opacity-0 w-full cursor-pointer"
            onChange={(e) => handleFileUpload(e, fileType)}
            disabled={uploadLoading[fileType]}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={uploadLoading[fileType]}
          >
            {uploadLoading[fileType] ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
        </div>
        {formData[`${fileType}_url` as keyof typeof formData] && (
          <a
            href={
              formData[`${fileType}_url` as keyof typeof formData] as string
            }
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2"
          >
            <Button type="button" variant="ghost" size="icon">
              <img
                src={
                  formData[`${fileType}_url` as keyof typeof formData] as string
                }
                alt={label}
                className="h-8 w-8 object-cover rounded"
              />
            </Button>
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Driver Management</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Driver
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Drivers</CardTitle>
              <CardDescription>Manage your driver database</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drivers..."
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
              <span className="ml-2">Loading drivers...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License Number</TableHead>
                  <TableHead>License Expiry</TableHead>
                  <TableHead>STNK Expiry</TableHead>
                  <TableHead>Reference Phone</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead>Driver Status</TableHead>
                  <TableHead>Is Online</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      No drivers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        {driver.name}
                      </TableCell>
                      <TableCell>{driver.email}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>{driver.license_number}</TableCell>
                      <TableCell>{driver.license_expiry}</TableCell>
                      <TableCell>{driver.stnk_expiry}</TableCell>
                      <TableCell>{driver.reference_phone}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {driver.selfie_url && (
                            <a
                              href={driver.selfie_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Selfie"
                            >
                              <img
                                src={driver.selfie_url}
                                alt="Selfie"
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            </a>
                          )}
                          {driver.sim_url && (
                            <a
                              href={driver.sim_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="SIM"
                            >
                              <img
                                src={driver.sim_url}
                                alt="SIM"
                                className="w-8 h-8 rounded object-cover"
                              />
                            </a>
                          )}
                          {driver.stnk_url && (
                            <a
                              href={driver.stnk_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="STNK"
                            >
                              <img
                                src={driver.stnk_url}
                                alt="STNK"
                                className="w-8 h-8 rounded object-cover"
                              />
                            </a>
                          )}
                          {driver.kk_url && (
                            <a
                              href={driver.kk_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="KK"
                            >
                              <img
                                src={driver.kk_url}
                                alt="KK"
                                className="w-8 h-8 rounded object-cover"
                              />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${driver.account_status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {driver.account_status || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${driver.account_status === "active" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {driver.account_status || "N/A"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${driver.is_online ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                        >
                          {driver.is_online ? "Online" : "Offline"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(driver)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-destructive"
                            onClick={() => openDeleteDialog(driver)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
            Showing {filteredDrivers.length} of {drivers.length} drivers
          </div>
          <Button variant="outline" onClick={fetchDrivers}>
            Refresh
          </Button>
        </CardFooter>
      </Card>

      {/* Add Driver Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Driver</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new driver to the database.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role_id" className="text-right">
                Select Driver Role
              </Label>
              <select
                id="role_id"
                name="role_id"
                value={formData.role_id?.toString() || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role_id: parseInt(e.target.value),
                  })
                }
                className="col-span-3 border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Pilih Role</option>
                <option value="2">Driver Mitra</option>
                <option value="3">Driver Perusahaan</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">
                Phone
              </Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reference_phone" className="text-right">
                Reference Phone
              </Label>
              <Input
                id="reference_phone"
                name="reference_phone"
                value={formData.reference_phone}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="license_number" className="text-right">
                License Number
              </Label>
              <Input
                id="license_number"
                name="license_number"
                value={formData.license_number}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="license_expiry" className="text-right">
                License Expiry
              </Label>
              <Input
                id="license_expiry"
                name="license_expiry"
                type="date"
                value={formData.license_expiry}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stnk_expiry" className="text-right">
                STNK Expiry
              </Label>
              <Input
                id="stnk_expiry"
                name="stnk_expiry"
                type="date"
                value={formData.stnk_expiry}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <FileUploadField label="Selfie" id="selfie" fileType="selfie" />
            <FileUploadField label="SIM" id="sim" fileType="sim" />
            <FileUploadField label="STNK" id="stnk" fileType="stnk" />
            <FileUploadField label="Kartu Keluarga" id="kk" fileType="kk" />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Account Status
              </Label>
              <Select
                name="status"
                value={formData.account_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, account_status: value })
                }
              >
                <SelectTrigger id="status" className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDriver}>Add Driver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Driver Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>
              Update the driver's information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-role" className="text-right">
                Driver Role
              </Label>
              <select
                id="edit-role"
                name="role_id"
                value={formData.role_id?.toString() || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role_id: parseInt(e.target.value),
                  })
                }
                className="col-span-3 border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Pilih Role</option>
                <option value="2">Driver Mitra</option>
                <option value="3">Driver Perusahaan</option>
              </select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-email" className="text-right">
                Email
              </Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="edit-phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-reference_phone" className="text-right">
                Reference Phone
              </Label>
              <Input
                id="edit-reference_phone"
                name="reference_phone"
                value={formData.reference_phone}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-license_number" className="text-right">
                License Number
              </Label>
              <Input
                id="edit-license_number"
                name="license_number"
                value={formData.license_number}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-license_expiry" className="text-right">
                License Expiry
              </Label>
              <Input
                id="edit-license_expiry"
                name="license_expiry"
                type="date"
                value={formData.license_expiry}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-stnk_expiry" className="text-right">
                STNK Expiry
              </Label>
              <Input
                id="edit-stnk_expiry"
                name="stnk_expiry"
                type="date"
                value={formData.stnk_expiry}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <FileUploadField
              label="Selfie"
              id="edit-selfie"
              fileType="selfie"
            />
            <FileUploadField label="SIM" id="edit-sim" fileType="sim" />
            <FileUploadField label="STNK" id="edit-stnk" fileType="stnk" />
            <FileUploadField
              label="Kartu Keluarga"
              id="edit-kk"
              fileType="kk"
            />
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Account Status
              </Label>
              <Select
                name="status"
                value={formData.account_status}
                onValueChange={(value) =>
                  setFormData({ ...formData, account_status: value })
                }
              >
                <SelectTrigger id="edit-status" className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditDriver}
              disabled={isSubmitting}
              type="button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Driver Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              driver and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDriver}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DriverManagement;
