import { supabase } from "./supabase";

/**
 * Helper function to invoke Supabase Edge Functions
 * @param functionName The name of the function to invoke
 * @param payload The payload to send to the function
 * @returns The response from the function
 */
export async function invokeEdgeFunction<T = any, P = any>(
  functionName: string,
  payload?: P,
): Promise<{
  data: T | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });

    if (error) {
      console.error(`Error invoking ${functionName}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error(`Exception invoking ${functionName}:`, error);
    return { data: null, error: error as Error };
  }
}

/**
 * Assign a role to a user
 * @param userId The user ID
 * @param roleId The role ID
 * @returns The response from the function
 */
export async function assignUserRole(userId: string, roleId: number) {
  return invokeEdgeFunction("assignRole", {
    userId,
    roleId,
  });
}

/**
 * Upload document images for a user
 * @param userId The user ID
 * @param ktpImage KTP image data URL (optional)
 * @param simImage SIM image data URL (optional)
 * @param idCardImage ID Card image data URL (optional)
 * @param kkImage KK (Family Card) image data URL (optional)
 * @param stnkImage STNK (Vehicle Registration) image data URL (optional)
 * @param skckImage SKCK (Police Clearance) image data URL (optional)
 * @returns The response from the function with URLs to the uploaded images
 */
export async function uploadDocumentImages(
  userId: string,
  ktpImage?: string,
  simImage?: string,
  idCardImage?: string,
  kkImage?: string,
  stnkImage?: string,
  skckImage?: string,
) {
  return invokeEdgeFunction("supabase-functions-uploadDocuments", {
    userId,
    ktpImage,
    simImage,
    idCardImage,
    kkImage,
    stnkImage,
    skckImage,
  });
}
