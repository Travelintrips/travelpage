import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Camera,
  Check,
  Upload,
  X,
  Loader2,
  Calendar,
  User,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

// Define the checklist item type
type ChecklistItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  is_required: boolean;
  damage_value: number;
  created_at: string;
};

// Dynamic form schema that will be built based on checklist items
const createFormSchema = (checklistItems: ChecklistItem[]) => {
  const baseSchema = {
    fuelLevel: z.enum(["empty", "quarter", "half", "threequarters", "full"], {
      required_error: "Please select fuel level",
    }),
    odometerReading: z.string().min(1, "Odometer reading is required"),
    additionalNotes: z.string().optional(),
  };

  // Add each checklist item to the schema
  const dynamicFields: Record<string, any> = {};
  checklistItems.forEach((item) => {
    dynamicFields[`item_${item.id}`] = z
      .boolean()
      .nullable()
      .default(undefined);
  });

  return z.object({ ...baseSchema, ...dynamicFields });
};

// Default form schema with just the basic fields
const defaultFormSchema = z.object({
  fuelLevel: z.enum(["empty", "quarter", "half", "threequarters", "full"], {
    required_error: "Please select fuel level",
  }),
  odometerReading: z.string().min(1, "Odometer reading is required"),
  additionalNotes: z.string().optional(),
});

type FormValues = z.infer<typeof defaultFormSchema> & Record<string, boolean>;

interface PreRentalInspectionFormProps {
  vehicleId: string;
  bookingId?: string;
  onComplete?: (data: any) => void;
  onCancel?: () => void;
}

const PreRentalInspectionForm: React.FC<PreRentalInspectionFormProps> = ({
  vehicleId = "v1",
  bookingId,
  onComplete,
  onCancel,
}) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formSchema, setFormSchema] = useState(defaultFormSchema);
  const [inspectionDate] = useState<Date>(new Date());
  const [inspectorName, setInspectorName] = useState<string>("");
  const [itemPhotos, setItemPhotos] = useState<Record<string, File[]>>({});
  const [itemPhotoUrls, setItemPhotoUrls] = useState<Record<string, string[]>>(
    {},
  );
  const [hasUncheckedItems, setHasUncheckedItems] = useState<boolean>(false);
  const [allItemsChecked, setAllItemsChecked] = useState<boolean>(false);
  const { toast } = useToast();

  // Fetch checklist items from the database and current user info
  useEffect(() => {
    const fetchChecklistItems = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("checklist_items")
          .select("*");

        if (error) {
          console.error("Error fetching checklist items:", error.message);
          throw error;
        }

        // Transform the data to match our ChecklistItem type
        const transformedData =
          data?.map((item) => ({
            id: item.id.toString(),
            name: item.item_name || item.name,
            description: item.description || "",
            category: item.category || "",
            is_required: item.is_required || false,
            damage_value: item.damage_value || 0,
            created_at: item.created_at,
          })) || [];

        setChecklistItems(transformedData);

        // Create dynamic form schema based on checklist items
        if (transformedData.length > 0) {
          const dynamicSchema = createFormSchema(transformedData);
          setFormSchema(dynamicSchema);
        }

        // Initialize item photos state
        const initialItemPhotos: Record<string, File[]> = {};
        const initialItemPhotoUrls: Record<string, string[]> = {};
        transformedData.forEach((item) => {
          initialItemPhotos[item.id] = [];
          initialItemPhotoUrls[item.id] = [];
        });
        setItemPhotos(initialItemPhotos);
        setItemPhotoUrls(initialItemPhotoUrls);
      } catch (error) {
        console.error("Error fetching checklist items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchUserInfo = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", session.user.id)
            .single();

          if (data && !error) {
            setInspectorName(
              data.full_name || session.user.email || "Unknown Inspector",
            );
          } else {
            setInspectorName(session.user.email || "Unknown Inspector");
          }
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        setInspectorName("Unknown Inspector");
      }
    };

    fetchChecklistItems();
    fetchUserInfo();
  }, []);

  // Create default values for the form
  const createDefaultValues = () => {
    const defaultValues: Record<string, any> = {
      fuelLevel: "full",
      odometerReading: "",
      additionalNotes: "",
    };

    // Add each checklist item to default values
    checklistItems.forEach((item) => {
      defaultValues[`item_${item.id}`] = undefined;
    });

    return defaultValues;
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: createDefaultValues(),
  });

  // Update form when checklist items change
  useEffect(() => {
    if (checklistItems.length > 0) {
      form.reset(createDefaultValues());
    }
  }, [checklistItems, form]);

  // Function to handle "Check All" functionality
  const handleCheckAll = (checked: boolean) => {
    // Set all items to the checked state (true for OK)
    checklistItems.forEach((item) => {
      form.setValue(`item_${item.id}`, checked);
    });
    setAllItemsChecked(checked);
  };

  // Watch for changes in the form values to update the allItemsChecked state
  useEffect(() => {
    const subscription = form.watch((value) => {
      if (checklistItems.length === 0) return;

      // Check if all items have a defined value (either true or false)
      const allDefined = checklistItems.every(
        (item) => value[`item_${item.id}`] !== undefined,
      );

      // Check if all items are marked as OK (true)
      const allOk = checklistItems.every(
        (item) => value[`item_${item.id}`] === true,
      );

      setAllItemsChecked(allDefined && allOk);
    });

    return () => subscription.unsubscribe();
  }, [form, checklistItems]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);
      setPhotos((prev) => [...prev, ...newPhotos]);

      // Create preview URLs for the photos
      newPhotos.forEach((photo) => {
        const url = URL.createObjectURL(photo);
        setPhotoUrls((prev) => [...prev, url]);
      });
    }
  };

  const handleItemPhotoChange = (
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);
      setItemPhotos((prev) => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), ...newPhotos],
      }));

      // Create preview URLs for the item photos
      newPhotos.forEach((photo) => {
        const url = URL.createObjectURL(photo);
        setItemPhotoUrls((prev) => ({
          ...prev,
          [itemId]: [...(prev[itemId] || []), url],
        }));
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));

    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(photoUrls[index]);
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeItemPhoto = (itemId: string, index: number) => {
    setItemPhotos((prev) => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, i) => i !== index),
    }));

    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(itemPhotoUrls[itemId][index]);
    setItemPhotoUrls((prev) => ({
      ...prev,
      [itemId]: prev[itemId].filter((_, i) => i !== index),
    }));
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) return [];

    setPhotoUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const photo of photos) {
        const fileName = `${vehicleId}/${bookingId || "pre-booking"}/${Date.now()}-${photo.name}`;
        const { data, error } = await supabase.storage
          .from("vehicle-inspections")
          .upload(fileName, photo);

        if (error) throw error;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("vehicle-inspections")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrlData.publicUrl);
      }
      return uploadedUrls;
    } catch (error) {
      console.error("Error uploading photos:", error);
      return [];
    } finally {
      setPhotoUploading(false);
    }
  };

  const uploadItemPhotos = async () => {
    const allItemIds = Object.keys(itemPhotos);
    if (allItemIds.length === 0) return {};

    setPhotoUploading(true);
    const uploadedItemUrls: Record<string, string[]> = {};

    try {
      for (const itemId of allItemIds) {
        const itemPhotoList = itemPhotos[itemId];
        if (!itemPhotoList || itemPhotoList.length === 0) {
          uploadedItemUrls[itemId] = [];
          continue;
        }

        uploadedItemUrls[itemId] = [];

        for (const photo of itemPhotoList) {
          const fileName = `${vehicleId}/${bookingId || "pre-booking"}/items/${itemId}/${Date.now()}-${photo.name}`;
          const { data, error } = await supabase.storage
            .from("vehicle-inspections")
            .upload(fileName, photo);

          if (error) throw error;

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from("vehicle-inspections")
            .getPublicUrl(fileName);

          uploadedItemUrls[itemId].push(publicUrlData.publicUrl);
        }
      }
      return uploadedItemUrls;
    } catch (error) {
      console.error("Error uploading item photos:", error);
      return {};
    } finally {
      setPhotoUploading(false);
    }
  };

  // Check if all required items have been checked
  const validateRequiredItems = (data: FormValues): boolean => {
    let allChecked = true;
    let uncheckedRequiredItems: string[] = [];

    checklistItems.forEach((item) => {
      if (item.is_required && data[`item_${item.id}`] === undefined) {
        allChecked = false;
        uncheckedRequiredItems.push(item.name);
      }
    });

    if (!allChecked) {
      toast({
        variant: "destructive",
        title: "Incomplete inspection",
        description: `Please check all required items: ${uncheckedRequiredItems.join(", ")}`,
      });
      setHasUncheckedItems(true);
    } else {
      setHasUncheckedItems(false);
    }

    return allChecked;
  };

  const onSubmit = async (data: FormValues) => {
    // First validate that all required items have been checked
    if (!validateRequiredItems(data)) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session?.user?.id) {
        throw new Error("You must be logged in to submit an inspection");
      }

      const userId = sessionData.session.user.id;

      // Upload photos to Supabase storage
      const uploadedPhotoUrls: string[] = await uploadPhotos();
      const uploadedItemPhotoUrls = await uploadItemPhotos();

      // Validate and ensure IDs are in UUID format
      const isValidUUID = (id) => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return id ? uuidRegex.test(id) : false;
      };

      // Extract checklist results
      const checklistResults = {};
      checklistItems.forEach((item) => {
        checklistResults[item.id] = {
          status: data[`item_${item.id}`] || false,
          photos: uploadedItemPhotoUrls[item.id] || [],
          damage_value: item.damage_value || 0,
        };
      });

      // Create inspection record in Supabase
      const inspectionData = {
        booking_id: bookingId
          ? isValidUUID(bookingId)
            ? bookingId
            : null
          : null,
        user_id: isValidUUID(userId) ? userId : null,
        inspection_type: "pre-rental",
        condition_notes: JSON.stringify({
          checklist: checklistResults,
          fuelLevel: data.fuelLevel,
          odometerReading: data.odometerReading,
          additionalNotes: data.additionalNotes || "",
          inspectionDate: inspectionDate.toISOString(),
          inspectorName: inspectorName,
        }),
        photo_urls: uploadedPhotoUrls,
        created_at: new Date().toISOString(),

        total_fees: 0, // No fees for pre-rental inspection
        fee_breakdown: [], // No fees for pre-rental inspection
      };

      if (!inspectionData.user_id) {
        throw new Error("Invalid user ID format");
      }

      if (bookingId && !inspectionData.booking_id) {
        throw new Error("Invalid booking ID format");
      }

      const { data: insertedInspection, error: inspectionError } =
        await supabase
          .from("inspections")
          .insert(inspectionData)
          .select()
          .single();

      if (inspectionError) throw inspectionError;

      console.log("Inspection saved:", insertedInspection);

      toast({
        title: "Inspection completed",
        description: "Pre-rental inspection has been successfully saved.",
      });

      // Call the onComplete callback with the form data and photo URLs
      if (onComplete) {
        onComplete({
          ...data,
          photos: uploadedPhotoUrls,
        });
      }
    } catch (error) {
      console.error("Error submitting inspection:", error);
      toast({
        variant: "destructive",
        title: "Error submitting inspection",
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto bg-background border shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Pre-Rental Inspection
        </CardTitle>
        <CardDescription>
          Complete the inspection form before handing over the vehicle.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="mb-6 bg-muted p-4 rounded-md">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Inspection Date:</span>
              <span className="text-sm">{format(inspectionDate, "PPP")}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Inspector:</span>
              <span className="text-sm">{inspectorName}</span>
            </div>
          </div>
        </div>

        {hasUncheckedItems && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Incomplete Inspection</AlertTitle>
            <AlertDescription>
              Please check all required items before submitting the inspection.
            </AlertDescription>
          </Alert>
        )}

        {/* Add Check All checkbox */}
        <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-100">
          <Checkbox
            id="check-all-items"
            checked={allItemsChecked}
            onCheckedChange={(checked) => handleCheckAll(!!checked)}
          />
          <Label htmlFor="check-all-items" className="text-sm font-medium">
            Check All as OK
          </Label>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading checklist items...</span>
                </div>
              ) : checklistItems.length === 0 ? (
                <div className="p-4 border rounded-md bg-amber-50 text-amber-800">
                  <p>
                    No checklist items found. Please add some in the admin
                    panel.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {checklistItems.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name={`item_${item.id}`}
                      render={({ field }) => (
                        <FormItem
                          className={`rounded-md border p-4 hover:bg-muted/50 transition-colors ${item.is_required ? "border-amber-300" : ""}`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div>
                              <FormLabel className="text-base font-medium flex items-center gap-1">
                                {item.name}
                                {item.is_required && (
                                  <span className="text-amber-500 text-xs font-normal">
                                    (Required)
                                  </span>
                                )}
                              </FormLabel>
                              {item.damage_value > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Damage Value: Rp{" "}
                                  {item.damage_value.toLocaleString()}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => field.onChange(true)}
                                className={`p-2 rounded-full transition-colors ${field.value === true ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}
                              >
                                <Check className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => field.onChange(false)}
                                className={`p-2 rounded-full transition-colors ${field.value === false ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"}`}
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          {item.description && (
                            <FormDescription className="mt-1">
                              {item.description}
                            </FormDescription>
                          )}
                          <div className="mt-2 flex items-center">
                            <div
                              className={`text-sm font-medium flex items-center ${field.value === true ? "text-green-600" : field.value === false ? "text-red-600" : "text-muted-foreground"}`}
                            >
                              {field.value === true && (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  <span>Baik</span>
                                </>
                              )}
                              {field.value === false && (
                                <>
                                  <X className="h-4 w-4 mr-1" />
                                  <span>Rusak</span>
                                </>
                              )}
                              {field.value === undefined && (
                                <span>Belum diperiksa</span>
                              )}
                            </div>
                          </div>

                          {/* Item photos section */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-medium">
                                Item Photos
                              </span>
                              <label className="flex items-center gap-1 text-xs text-primary cursor-pointer hover:underline">
                                <Camera className="h-3 w-3" />
                                Add Photo
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(e) =>
                                    handleItemPhotoChange(item.id, e)
                                  }
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {itemPhotoUrls[item.id] &&
                            itemPhotoUrls[item.id].length > 0 ? (
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                {itemPhotoUrls[item.id].map((url, index) => (
                                  <div
                                    key={index}
                                    className="relative h-16 rounded-md overflow-hidden border"
                                  >
                                    <img
                                      src={url}
                                      alt={`${item.name} photo ${index + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeItemPhoto(item.id, index)
                                      }
                                      className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic">
                                No photos added
                              </div>
                            )}
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              )}

              <FormField
                control={form.control}
                name="fuelLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuel Level</FormLabel>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={field.value}
                      onChange={field.onChange}
                    >
                      <option value="empty">Empty</option>
                      <option value="quarter">1/4 Tank</option>
                      <option value="half">1/2 Tank</option>
                      <option value="threequarters">3/4 Tank</option>
                      <option value="full">Full Tank</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="odometerReading"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Odometer Reading (km)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Note any existing damage or issues with the vehicle"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Vehicle Photos</FormLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                  {photoUrls.map((url, index) => (
                    <div
                      key={index}
                      className="relative h-24 rounded-md overflow-hidden border"
                    >
                      <img
                        src={url}
                        alt={`Vehicle photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50">
                    <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">
                      Add Photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <FormDescription>
                  Take photos of the vehicle from all angles, including any
                  existing damage.
                </FormDescription>
              </div>
            </div>

            <div className="flex justify-between mt-6">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}

              <Button
                type="submit"
                className="ml-auto"
                disabled={isSubmitting || photoUploading}
              >
                {isSubmitting || photoUploading
                  ? "Processing..."
                  : "Complete Inspection"}
                {!isSubmitting && !photoUploading && (
                  <Check className="ml-2 h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default PreRentalInspectionForm;
