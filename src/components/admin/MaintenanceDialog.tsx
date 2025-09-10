import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  license_plate: string;
  status: string;
}

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MaintenanceDialog: React.FC<MaintenanceDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [maintenanceNote, setMaintenanceNote] = useState("");
  const [setToMaintenance, setSetToMaintenance] = useState(true);
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchVehicles();
    }
  }, [open]);

  const fetchVehicles = async () => {
    try {
      setVehiclesLoading(true);
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, make, model, license_plate, status")
        .order("make", { ascending: true });

      if (error) throw error;

      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setVehiclesLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedVehicle) {
      alert("Please select a vehicle");
      return;
    }

    if (setToMaintenance && !maintenanceNote.trim()) {
      alert("Please enter maintenance notes when setting to maintenance");
      return;
    }

    try {
      setLoading(true);

      const newStatus = setToMaintenance ? "maintenance" : "available";
      
      const { error } = await supabase
        .from("vehicles")
        .update({
          status: newStatus,
          maintenance_note: maintenanceNote.trim(),
        })
        .eq("id", selectedVehicle.id);

      if (error) throw error;

      alert(`Vehicle ${setToMaintenance ? 'set to' : 'removed from'} maintenance successfully!`);
      handleClose();
    } catch (error) {
      console.error("Error updating vehicle:", error);
      alert(`Failed to update vehicle: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedVehicle(null);
    setMaintenanceNote("");
    setSetToMaintenance(true);
    setComboboxOpen(false);
    onOpenChange(false);
  };

  const getVehicleDisplayText = (vehicle: Vehicle) => {
    return `${vehicle.make} ${vehicle.model} - ${vehicle.license_plate || 'No Plate'}`;
  };

  return (
    <div className="bg-white">
      <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
  <DialogContent className="max-w-md">
    <DialogHeader>
      <DialogTitle>Maintenance Management</DialogTitle>
      <DialogDescription>
        Set vehicles to maintenance mode with description.
      </DialogDescription>
    </DialogHeader>

    <div className="grid gap-4 py-4">
  {/* Vehicle Selection */}
  <div className="grid grid-cols-4 items-center gap-4">
    <Label htmlFor="vehicle" className="text-right">
      Vehicle
    </Label>
    <div className="col-span-3">
      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={comboboxOpen}
            className="w-full justify-between"
            disabled={vehiclesLoading}
          >
            {vehiclesLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading vehicles...
              </>
            ) : selectedVehicle ? (
              getVehicleDisplayText(selectedVehicle)
            ) : (
              "Select vehicle..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[400px] p-0"
          align="start"
          forceMount
          onOpenAutoFocus={(e) => e.preventDefault()} // ⬅️ penting
        >
          <Command>
            <CommandInput
              placeholder="Search vehicles..."
              className="h-9"
            />
            <CommandEmpty>No vehicle found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {vehicles.map((vehicle) => (
                <CommandItem
                  key={vehicle.id}
                  value={getVehicleDisplayText(vehicle)}
                  onSelect={() => {
                    setSelectedVehicle(vehicle);
                    setComboboxOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedVehicle?.id === vehicle.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {vehicle.make} {vehicle.model}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {vehicle.license_plate || "No License Plate"} • Status:{" "}
                      {vehicle.status}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  </div>



      {/* Maintenance Notes */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="maintenance-note" className="text-right mt-2">
          Notes
        </Label>
        <Textarea
          id="maintenance-note"
          placeholder="Enter maintenance description..."
          value={maintenanceNote}
          onChange={(e) => setMaintenanceNote(e.target.value)}
          className="col-span-3 min-h-[80px]"
        />
      </div>

      {/* Maintenance Toggle */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="maintenance-toggle" className="text-right">
          Status
        </Label>
        <div className="col-span-3 flex items-center space-x-2">
          <Switch
            id="maintenance-toggle"
            checked={setToMaintenance}
            onCheckedChange={(value) => setSetToMaintenance(value)}
          />
          <span className="text-sm text-muted-foreground">
            {setToMaintenance
              ? "Vehicle will be in maintenance mode"
              : "Vehicle will be available"}
          </span>
        </div>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={handleClose} disabled={loading}>
        Cancel
      </Button>
      <Button
        onClick={handleSave}
        disabled={loading || !selectedVehicle}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save"
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

    </div>
  );
};

export default MaintenanceDialog;