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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, RefreshCcw, Search, ClipboardCheck, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Inspection {
  id: number;
  booking_id: number | null;
  user_id: string | null;
  inspection_type: string | null;
  condition_notes: string | object | null;
  photo_urls: string[] | null;
  created_at: string | null;
}

const InspectionManagement = () => {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspection, setSelectedInspection] =
    useState<Inspection | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inspections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (data) {
        setInspections(data as Inspection[]);
      }
    } catch (error) {
      console.error("Error fetching inspections:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const getInspectionTypeLabel = (type: string | null) => {
    if (!type) return "Unknown";
    switch (type.toLowerCase()) {
      case "pre-rental":
        return "Pre-Rental";
      case "post-rental":
        return "Post-Rental";
      default:
        return type;
    }
  };

  function parseNotes(rawNotes: string | object | null): string {
    if (!rawNotes) return "No notes";

    try {
      let notes: any;

      if (typeof rawNotes === "string") {
        notes = JSON.parse(rawNotes);
      } else {
        notes = rawNotes; // langsung pakai kalau sudah object
      }

      if (typeof notes.description === "string") {
        return notes.description;
      }

      if (typeof notes.checklist === "object") {
        return JSON.stringify(notes.checklist);
      }

      if (typeof notes.checklist === "string") {
        return notes.checklist;
      }

      return "No notes";
    } catch (error) {
      return "Invalid notes";
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
          Vehicle Inspection Management
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-indigo-200 hover:bg-indigo-50 text-indigo-700"
            onClick={fetchInspections}
          >
            <RefreshCcw className="h-4 w-4 mr-2 text-indigo-500" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
          >
            <Search className="h-4 w-4 mr-2" />
            Search Inspections
          </Button>
        </div>
      </div>

      <Card className="bg-white shadow-md border-0 overflow-hidden rounded-xl mb-6">
        <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 pb-4">
          <CardTitle className="text-lg font-medium text-indigo-700">
            <div className="flex items-center">
              <ClipboardCheck className="h-5 w-5 mr-2 text-indigo-500" />
              Vehicle Inspections
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
              <TableCaption>A list of all vehicle inspections</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No inspection records found
                    </TableCell>
                  </TableRow>
                ) : (
                  inspections.map((inspection) => (
                    <TableRow key={inspection.id}>
                      <TableCell className="font-medium">
                        {inspection.id}
                      </TableCell>
                      <TableCell>{inspection.booking_id || "N/A"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            inspection.inspection_type === "pre-rental"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {getInspectionTypeLabel(inspection.inspection_type)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {parseNotes(inspection.condition_notes)}
                      </TableCell>

                      <TableCell>
                        {inspection.photo_urls &&
                        inspection.photo_urls.length > 0
                          ? `${inspection.photo_urls.length} photos`
                          : "No photos"}
                      </TableCell>
                      <TableCell>{formatDate(inspection.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInspection(inspection);
                              setIsViewDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInspection(inspection);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-1" /> Edit
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
      </Card>

      {/* View Inspection Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Inspection Details</DialogTitle>
            <DialogDescription>
              Detailed information about the inspection
            </DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <p>
                    <span className="font-medium">ID:</span>{" "}
                    {selectedInspection.id}
                  </p>
                  <p>
                    <span className="font-medium">Booking ID:</span>{" "}
                    {selectedInspection.booking_id || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span>{" "}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedInspection.inspection_type === "pre-rental"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {getInspectionTypeLabel(
                        selectedInspection.inspection_type,
                      )}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(selectedInspection.created_at)}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Condition Notes</h3>
                  <p className="whitespace-pre-wrap">
                    {typeof selectedInspection.condition_notes === "string"
                      ? selectedInspection.condition_notes
                      : JSON.stringify(selectedInspection.condition_notes) ||
                        "No notes provided"}
                  </p>
                </div>
              </div>

              {selectedInspection.photo_urls &&
                selectedInspection.photo_urls.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedInspection.photo_urls.map((url, index) => (
                        <div
                          key={index}
                          className="relative h-40 rounded-md overflow-hidden border"
                        >
                          <img
                            src={url}
                            alt={`Inspection photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Inspection Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inspection</DialogTitle>
            <DialogDescription>Update inspection details</DialogDescription>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Inspection Type
                  </label>
                  <select
                    className="w-full p-2 border rounded-md"
                    defaultValue={selectedInspection.inspection_type || ""}
                  >
                    <option value="pre-rental">Pre-Rental</option>
                    <option value="post-rental">Post-Rental</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Condition Notes
                  </label>
                  <textarea
                    className="w-full p-2 border rounded-md min-h-[100px]"
                    defaultValue={
                      typeof selectedInspection.condition_notes === "string"
                        ? selectedInspection.condition_notes
                        : selectedInspection.condition_notes
                          ? JSON.stringify(selectedInspection.condition_notes)
                          : ""
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Here you would implement the actual update logic
                alert("Update functionality will be implemented here");
                setIsEditDialogOpen(false);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InspectionManagement;
