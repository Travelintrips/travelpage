import { supabase } from "./supabase";

/**
 * Ensures all required storage buckets exist
 * This should be called when the application initializes
 */
export const setupStorageBuckets = async (): Promise<void> => {
  try {
    // Call the edge function to create buckets
    const { data, error } = await supabase.functions.invoke(
      "create-storage-buckets",
    );

    if (error) {
      console.error("Error setting up storage buckets:", error);
    } else {
      console.log("Storage buckets setup complete:", data);
    }
  } catch (error) {
    console.error("Failed to setup storage buckets:", error);
  }
};
