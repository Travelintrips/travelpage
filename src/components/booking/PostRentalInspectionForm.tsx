import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Camera, Check, Upload, X, Loader2, AlertCircle } from "lucide-react";

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
    newDamageFound: z.boolean().default(false),
    damageDescription: z.string().optional(),
    additionalNotes: z.string().optional(),
    totalDamageCost: z.number().min(0).optional(),
  };

  // Add each checklist item to the schema
  const dynamicFields: Record<string, any> = {};
  checklistItems.forEach((item) => {
    dynamicFields[`item_${item.id}`] = z.boolean().default(false);
    dynamicFields[`notes_${item.id}`] = z.string().optional();
  });

  return z.object({ ...baseSchema, ...dynamicFields });
};

// Default form schema with just the basic fields
const defaultFormSchema = z.object({
  fuelLevel: z.enum(["empty", "quarter", "half", "threequarters", "full"], {
    required_error: "Please select fuel level",
  }),
  odometerReading: z.string().min(1, "Odometer reading is required"),
  newDamageFound: z.boolean().default(false),
  damageDescription: z.string().optional(),
  additionalNotes: z.string().optional(),
  totalDamageCost: z.number().min(0).optional(),
});

type FormValues = z.infer<typeof defaultFormSchema> &
  Record<string, boolean | string>;

interface PostRentalInspectionFormProps {
  vehicleId: string;
  bookingId: string;
  preInspectionData?: any; // Data from pre-rental inspection for comparison
  onComplete?: (
    data: FormValues & {
      photos: string[];
      calculatedFees: number;
      inspectionId?: any;
    },
  ) => void;
  onCancel?: () => void;
}

const PostRentalInspectionForm: React.FC<PostRentalInspectionFormProps> = ({
  vehicleId = "v1",
  bookingId,
  preInspectionData,
  onComplete,
  onCancel,
}) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedFees, setCalculatedFees] = useState(0);
  const [fees, setFees] = useState<number>(0);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [feeBreakdown, setFeeBreakdown] = useState<
    Array<{ type: string; amount: number; description: string }>
  >([]);
  const [itemPhotos, setItemPhotos] = useState<Record<string, File[]>>({});
  const [itemPhotoUrls, setItemPhotoUrls] = useState<Record<string, string[]>>(
    {},
  );
  const [uploadedItemPhotoUrls, setUploadedItemPhotoUrls] = useState<
    Record<string, string[]>
  >({});
  const [preInspectionItems, setPreInspectionItems] = useState<
    Record<string, any>
  >({});
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formSchema, setFormSchema] = useState(defaultFormSchema);
  const [damagedItemsCount, setDamagedItemsCount] = useState(0);
  const [checkAll, setCheckAll] = useState(true);
  const { toast } = useToast();

  // Fetch checklist items from the database and pre-inspection data if available
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

        // Extract pre-inspection data if available
        if (preInspectionData && preInspectionData.condition_notes) {
          try {
            const preInspectionFormData = JSON.parse(
              preInspectionData.condition_notes,
            );
            if (preInspectionFormData.checklist) {
              setPreInspectionItems(preInspectionFormData.checklist);
            }
          } catch (error) {
            console.error("Error parsing pre-inspection data:", error);
          }
        }
      } catch (error) {
        console.error("Error fetching checklist items:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChecklistItems();
  }, [preInspectionData]);

  // Create default values for the form
  const createDefaultValues = () => {
    const defaultValues: Record<string, any> = {
      fuelLevel: "full",
      odometerReading: "",
      newDamageFound: false,
      damageDescription: "",
      additionalNotes: "",
      totalDamageCost: 0,
    };

    // Add each checklist item to default values
    checklistItems.forEach((item) => {
      defaultValues[`item_${item.id}`] = false;
      defaultValues[`notes_${item.id}`] = "";
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

  // Watch for damage found to show/hide damage description field
  const newDamageFound = form.watch("newDamageFound");

  // Watch all item fields to count damaged items and update checkAll state
  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
      if (type === "change" && name && name.startsWith("item_")) {
        // Count damaged items (where value is false)
        let count = 0;
        let allChecked = true;

        checklistItems.forEach((item) => {
          if (value[`item_${item.id}`] === false) {
            count++;
            allChecked = false;
          }
        });

        setDamagedItemsCount(count);
        setCheckAll(allChecked);
      }
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

  const handleUpload = async (files: File[]) => {
    const urls: string[] = [];

    for (const file of files) {
      const { data, error } = await supabase.storage
        .from("inspection_photos")
        .upload(`photos/${file.name}`, file);

      if (error) continue;

      const url = supabase.storage
        .from("inspection_photos")
        .getPublicUrl(data.path).publicUrl;

      urls.push(url);
    }

    setUploadedPhotoUrls(urls);
  };

  const uploadPhotos = async () => {
    if (photos.length === 0) return [];

    setPhotoUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const photo of photos) {
        const fileName = `${vehicleId}/${bookingId}/post-rental/${Date.now()}-${photo.name}`;
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
          const fileName = `${vehicleId}/${bookingId}/post-rental/items/${itemId}/${Date.now()}-${photo.name}`;
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
      setUploadedItemPhotoUrls(uploadedItemUrls);
      return uploadedItemUrls;
    } catch (error) {
      console.error("Error uploading item photos:", error);
      return {};
    } finally {
      setPhotoUploading(false);
    }
  };

  // Calculate additional fees based on inspection results
  const calculateAdditionalFees = (data: FormValues): number => {
    let fees = 0;
    let feeBreakdown = [];

    // Check fuel level difference
    if (preInspectionData && preInspectionData.condition_notes) {
      try {
        // Try to parse the pre-inspection data
        const preInspectionFormData = JSON.parse(
          preInspectionData.condition_notes,
        );

        // Compare fuel levels if available
        if (
          preInspectionFormData.fuelLevel &&
          preInspectionFormData.fuelLevel !== data.fuelLevel
        ) {
          const fuelLevels = {
            empty: 0,
            quarter: 0.25,
            half: 0.5,
            threequarters: 0.75,
            full: 1,
          };

          const preLevel =
            fuelLevels[
              preInspectionFormData.fuelLevel as keyof typeof fuelLevels
            ] || 1;
          const postLevel =
            fuelLevels[data.fuelLevel as keyof typeof fuelLevels];

          if (postLevel < preLevel) {
            // Assuming fuel tank is 40 liters and fuel costs Rp 10,000 per liter
            const missingFuel = (preLevel - postLevel) * 40;
            const fuelFee = missingFuel * 10000;
            fees += fuelFee;
            feeBreakdown.push({
              type: "fuel",
              amount: fuelFee,
              description: `Missing fuel (${Math.round(missingFuel)} liters)`,
            });
          }
        }
      } catch (error) {
        console.error("Error parsing pre-inspection data:", error);
      }
    } else {
      // Fallback if no pre-inspection data or can't parse it
      if (data.fuelLevel !== "full") {
        const fuelLevels = {
          empty: 0,
          quarter: 0.25,
          half: 0.5,
          threequarters: 0.75,
          full: 1,
        };

        const postLevel = fuelLevels[data.fuelLevel as keyof typeof fuelLevels];
        const missingFuel = (1 - postLevel) * 40; // Assuming it should be full
        const fuelFee = missingFuel * 10000;
        fees += fuelFee;
        feeBreakdown.push({
          type: "fuel",
          amount: fuelFee,
          description: `Missing fuel (${Math.round(missingFuel)} liters)`,
        });
      }
    }

    // Add damage fees if new damage is found
    if (data.newDamageFound) {
      // Base damage fee
      const damageFee = 500000;
      fees += damageFee;
      feeBreakdown.push({
        type: "damage",
        amount: damageFee,
        description: "New damage found",
      });
    }

    // Add damage fees for each damaged item
    let totalDamageValue = 0;
    checklistItems.forEach((item) => {
      if (data[`item_${item.id}`] === false) {
        totalDamageValue += item.damage_value;
      }
    });

    if (totalDamageValue > 0) {
      feeBreakdown.push({
        type: "item_damage",
        amount: totalDamageValue,
        description: `Damaged items (${damagedItemsCount} items)`,
      });
      fees += totalDamageValue;
    }

    // Check for cleaning issues
    const exteriorCleanItem = checklistItems.find((item) =>
      item.name.toLowerCase().includes("exterior clean"),
    );
    const interiorCleanItem = checklistItems.find((item) =>
      item.name.toLowerCase().includes("interior clean"),
    );

    const exteriorClean = exteriorCleanItem
      ? data[`item_${exteriorCleanItem.id}`] === true
      : true;
    const interiorClean = interiorCleanItem
      ? data[`item_${interiorCleanItem.id}`] === true
      : true;

    // Add cleaning fee if vehicle is not clean
    if (!exteriorClean || !interiorClean) {
      const cleaningFee = 150000;
      fees += cleaningFee;
      feeBreakdown.push({
        type: "cleaning",
        amount: cleaningFee,
        description: `Vehicle requires cleaning (${!exteriorClean ? "exterior" : ""}${!exteriorClean && !interiorClean ? " and " : ""}${!interiorClean ? "interior" : ""})`,
      });
    }

    // Add manual damage cost if provided
    if (
      data.totalDamageCost &&
      typeof data.totalDamageCost === "number" &&
      data.totalDamageCost > 0
    ) {
      fees += data.totalDamageCost;
      feeBreakdown.push({
        type: "manual_damage",
        amount: data.totalDamageCost,
        description: "Manual damage cost entry",
      });
    }

    // Store the fee breakdown for later use
    setFeeBreakdown(feeBreakdown);

    return fees;
  };

  // UUID validation function
  const isValidUUID = (uuid: string) => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Validate booking ID
      if (!bookingId || !isValidUUID(bookingId)) {
        throw new Error("Invalid booking ID format");
      }

      // Get current user
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session?.user?.id) {
        throw new Error("You must be logged in to submit an inspection");
      }

      const userId = sessionData.session.user.id;

      // Validate user ID
      if (!isValidUUID(userId)) {
        throw new Error("Invalid user ID format");
      }

      // Upload photos to Supabase storage
      const uploadedPhotoUrls = await uploadPhotos();
      const uploadedItemPhotoUrls = await uploadItemPhotos();

      // Calculate additional fees
      const fees = calculateAdditionalFees(data);
      setCalculatedFees(fees);

      // Validate vehicle ID if provided
      if (vehicleId && !isValidUUID(vehicleId)) {
        throw new Error("Invalid vehicle ID format");
      }

      // Extract checklist results
      const checklistResults = {};
      checklistItems.forEach((item) => {
        checklistResults[item.id] = {
          status: data[`item_${item.id}`] || false,
          photos: uploadedItemPhotoUrls[item.id] || [],
          damage_value: item.damage_value || 0,
          notes: data[`notes_${item.id}`] || "",
        };
      });

      // Create inspection record in Supabase
      const inspectionData = {
        booking_id: bookingId, // Use the UUID directly, not parsed as integer
        user_id: userId, // Already a UUID string
        inspection_type: "post-rental",
        condition_notes: JSON.stringify({
          checklist: checklistResults,
          fuelLevel: data.fuelLevel,
          odometerReading: data.odometerReading,
          newDamageFound: data.newDamageFound,
          damageDescription: data.damageDescription || "",
          additionalNotes: data.additionalNotes || "",
          totalDamageCost: data.totalDamageCost || 0,
          damagedItemsCount: damagedItemsCount,
        }),
        photo_urls: uploadedPhotoUrls,
        created_at: new Date().toISOString(),
        total_fees: fees,
        fee_breakdown: feeBreakdown,
      };

      const { data: insertedInspection, error: inspectionError } =
        await supabase
          .from("inspections")
          .insert(inspectionData)
          .select()
          .single();

      if (inspectionError) throw inspectionError;

      const damagedItems = checklistItems.filter((item) => {
        return data[`item_${item.id}`] === false;
      });

      if (damagedItems.length > 0) {
        const autoDamages = damagedItems.map((item) => ({
          booking_id: bookingId,
          description: item.name || "Item rusak",
          amount: item.damage_value || 0,
          payment_status: "unpaid",
        }));

        const { error: damageError } = await supabase
          .from("damages")
          .insert(autoDamages);

        if (damageError) {
          console.error(
            "Gagal menyimpan kerusakan otomatis:",
            damageError.message,
          );
        } else {
          console.log("Damage item berhasil disimpan otomatis:", autoDamages);
        }
      }

      // If there are additional fees, create a payment record
      if (fees > 0) {
        const paymentData = {
          booking_id: bookingId, // Use the UUID directly
          user_id: userId, // Already a UUID string
          amount: fees,
          payment_method: "pending",
          status: "pending",
          created_at: new Date().toISOString(),
        };

        const { error: paymentError } = await supabase
          .from("payments")
          .insert(paymentData);

        if (paymentError) throw paymentError;
      }

      // Update booking status to finished
      const { error: bookingError } = await supabase
        .from("bookings")
        .update({ status: "finished" })
        .eq("id", bookingId); // Use the UUID directly

      // Fee breakdown is now included in the initial insert

      if (bookingError) throw bookingError;

      console.log("Post-rental inspection saved:", insertedInspection);

      // Show success message to the user
      toast({
        title: "Inspection completed",
        description:
          fees > 0
            ? `Vehicle return processed with additional fees: Rp ${fees.toLocaleString()}`
            : "Vehicle return processed successfully. No additional fees required.",
        variant: "default",
      });

      // Call the onComplete callback with the form data, photo URLs, and calculated fees
      if (onComplete) {
        onComplete({
          ...data,
          photos: uploadedPhotoUrls,
          calculatedFees: fees,
          inspectionId: insertedInspection.id,
        } as FormValues & {
          photos: string[];
          calculatedFees: number;
          inspectionId?: any;
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
          Inspeksi Pengembalian Kendaraan
        </CardTitle>
        <CardDescription>
          Lengkapi formulir inspeksi setelah kendaraan dikembalikan.
          Perbandingan dengan kondisi awal akan ditampilkan.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Summary section */}
        <div className="mb-6 bg-muted p-4 rounded-md">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="w-full">
              <h3 className="text-sm font-medium">Ringkasan Inspeksi</h3>
              <div className="mt-2 text-sm">
                <div className="flex justify-between">
                  <span>Total item diperiksa:</span>
                  <span className="font-medium">{checklistItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Item rusak:</span>
                  <span className="font-medium text-red-600">
                    {damagedItemsCount}
                  </span>
                </div>
                {calculatedFees > 0 && (
                  <div className="flex justify-between mt-1 pt-1 border-t">
                    <span>Total biaya:</span>
                    <span className="font-medium text-red-600">
                      Rp {calculatedFees.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Pre-inspection summary */}
              {preInspectionData && (
                <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                  <h3 className="text-sm font-medium">
                    Perbandingan dengan Inspeksi Awal
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-green-50 p-2 rounded-md">
                      <span className="font-medium block mb-1">
                        Tanggal Inspeksi Awal:
                      </span>
                      <span>
                        {preInspectionData.created_at
                          ? new Date(
                              preInspectionData.created_at,
                            ).toLocaleDateString("id-ID", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Tidak tersedia"}
                      </span>
                    </div>

                    {preInspectionData.condition_notes && (
                      <div className="bg-blue-50 p-2 rounded-md">
                        <span className="font-medium block mb-1">
                          Level Bahan Bakar Awal:
                        </span>
                        <span className="capitalize">
                          {(() => {
                            try {
                              const notes = JSON.parse(
                                preInspectionData.condition_notes,
                              );
                              const fuelLevelMap = {
                                empty: "Kosong",
                                quarter: "1/4 Tangki",
                                half: "1/2 Tangki",
                                threequarters: "3/4 Tangki",
                                full: "Penuh",
                              };
                              return (
                                fuelLevelMap[notes.fuelLevel] || notes.fuelLevel
                              );
                            } catch (e) {
                              return "Tidak tersedia";
                            }
                          })()}
                        </span>
                      </div>
                    )}

                    {preInspectionData.condition_notes && (
                      <div className="bg-amber-50 p-2 rounded-md">
                        <span className="font-medium block mb-1">
                          Odometer Awal:
                        </span>
                        <span>
                          {(() => {
                            try {
                              const notes = JSON.parse(
                                preInspectionData.condition_notes,
                              );
                              return notes.odometerReading
                                ? `${notes.odometerReading} km`
                                : "Tidak tersedia";
                            } catch (e) {
                              return "Tidak tersedia";
                            }
                          })()}
                        </span>
                      </div>
                    )}

                    {preInspectionData.photo_urls &&
                      preInspectionData.photo_urls.length > 0 && (
                        <div className="bg-purple-50 p-2 rounded-md">
                          <span className="font-medium block mb-1">
                            Foto Kendaraan Awal:
                          </span>
                          <span
                            className="text-primary hover:underline cursor-pointer"
                            onClick={() => {
                              const photoUrls = preInspectionData.photo_urls;
                              if (photoUrls && photoUrls.length > 0) {
                                window.open(photoUrls[0], "_blank");
                              }
                            }}
                          >
                            Lihat {preInspectionData.photo_urls.length} foto
                          </span>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {calculatedFees > 0 && feeBreakdown.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <h3 className="font-medium text-amber-800 mb-2">Additional Fees</h3>
            <div className="space-y-2">
              {feeBreakdown.map((fee, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-amber-700">{fee.description}</span>
                  <span className="font-medium text-amber-800">
                    Rp {fee.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-amber-200 flex justify-between font-medium">
                <span className="text-amber-800">Total Additional Fees</span>
                <span className="text-amber-900">
                  Rp {calculatedFees.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
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
                <>
                  <div className="flex items-center space-x-2 mb-4 p-3 bg-muted rounded-md">
                    <Checkbox
                      id="check-all"
                      checked={checkAll}
                      onCheckedChange={(checked) => {
                        setCheckAll(!!checked);
                        // Update all checklist items
                        checklistItems.forEach((item) => {
                          form.setValue(`item_${item.id}`, !!checked);
                        });
                      }}
                    />
                    <FormLabel
                      htmlFor="check-all"
                      className="font-medium cursor-pointer"
                    >
                      Tandai Semua Item dalam Kondisi Baik
                    </FormLabel>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {checklistItems.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name={`item_${item.id}`}
                        render={({ field }) => (
                          <FormItem className="rounded-md border p-4 hover:bg-muted/50 transition-colors">
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <FormLabel className="text-base font-medium">
                                  {item.name}
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

                            {/* Pre-inspection status comparison */}
                            {preInspectionItems[item.id] && (
                              <div className="mt-2 bg-muted/30 p-2 rounded-md text-xs space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">
                                    Status sebelum disewa:
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full ${
                                      preInspectionItems[item.id].status
                                        ? "bg-green-100 text-green-600"
                                        : "bg-red-100 text-red-600"
                                    }`}
                                  >
                                    {preInspectionItems[item.id].status
                                      ? "Baik"
                                      : "Rusak"}
                                  </span>
                                </div>

                                {preInspectionItems[item.id].photos &&
                                  preInspectionItems[item.id].photos.length >
                                    0 && (
                                    <div>
                                      <span className="font-medium block mb-1">
                                        Foto sebelum disewa:
                                      </span>
                                      <div className="flex gap-1 overflow-x-auto pb-1">
                                        {preInspectionItems[item.id].photos.map(
                                          (photo, idx) => (
                                            <a
                                              key={idx}
                                              href={photo}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex-shrink-0"
                                            >
                                              <img
                                                src={photo}
                                                alt={`Pre-rental ${item.name} ${idx + 1}`}
                                                className="h-12 w-12 object-cover rounded border border-muted"
                                              />
                                            </a>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
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

                            {/* Notes field for this item */}
                            <div className="mt-3">
                              <FormField
                                control={form.control}
                                name={`notes_${item.id}`}
                                render={({ field: notesField }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs flex justify-between">
                                      <span>Keterangan</span>
                                      {preInspectionItems[item.id] &&
                                        preInspectionItems[item.id].status !==
                                          field.value && (
                                          <span className="text-amber-600 font-medium">
                                            Kondisi berubah!
                                          </span>
                                        )}
                                    </FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Tambahkan keterangan tentang kondisi item"
                                        className="resize-none text-sm"
                                        rows={2}
                                        value={
                                          typeof notesField.value === "string"
                                            ? notesField.value
                                            : ""
                                        }
                                        onChange={notesField.onChange}
                                        onBlur={notesField.onBlur}
                                        name={notesField.name}
                                        ref={notesField.ref}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>

                            {/* Item photos section */}
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium">
                                  Foto Bukti
                                </span>
                                <label className="flex items-center gap-1 text-xs text-primary cursor-pointer hover:underline">
                                  <Camera className="h-3 w-3" />
                                  Tambah Foto
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
                                  Belum ada foto
                                </div>
                              )}
                            </div>
                          </FormItem>
                        )}
                      />
                    ))}

                    <FormField
                      control={form.control}
                      name="newDamageFound"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>New Damage Found</FormLabel>
                            <FormDescription>
                              Vehicle has new damage not present in pre-rental
                              inspection
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </>
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

              {newDamageFound && (
                <FormField
                  control={form.control}
                  name="damageDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Damage Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the damage in detail"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="additionalNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any other notes about the vehicle condition"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalDamageCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Biaya Denda/Kerusakan</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        placeholder="Masukkan total biaya denda/kerusakan"
                      />
                    </FormControl>
                    <FormDescription>
                      Masukkan total biaya denda/kerusakan yang harus dibayar
                      pelanggan
                    </FormDescription>
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
                  Take photos of the vehicle from all angles, including any new
                  damage.
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

export default PostRentalInspectionForm;
