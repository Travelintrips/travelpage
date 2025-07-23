import { supabase } from "./supabase";
import { invokeEdgeFunction } from "./edgeFunctions";

/**
 * Process pending webhooks using the edge function
 * @returns The response from the edge function
 */
export async function processWebhooks() {
  return invokeEdgeFunction("supabase-functions-process-webhooks");
}

/**
 * Register a new webhook
 * @param url The URL to send the webhook to
 * @param eventType The event type to listen for (e.g., "bookings.created")
 * @returns The response from the database
 */
export async function registerWebhook(url: string, eventType: string) {
  return supabase
    .from("webhooks")
    .insert({
      url,
      event_type: eventType,
      is_active: true,
    })
    .select();
}

/**
 * Get all registered webhooks
 * @returns The response from the database
 */
export async function getWebhooks() {
  return supabase.from("webhooks").select("*");
}

/**
 * Update a webhook's status
 * @param id The webhook ID
 * @param isActive Whether the webhook is active
 * @returns The response from the database
 */
export async function updateWebhookStatus(id: number, isActive: boolean) {
  return supabase
    .from("webhooks")
    .update({ is_active: isActive })
    .eq("id", id)
    .select();
}

/**
 * Delete a webhook
 * @param id The webhook ID
 * @returns The response from the database
 */
export async function deleteWebhook(id: number) {
  return supabase.from("webhooks").delete().eq("id", id);
}

/**
 * Get webhook logs
 * @param limit The maximum number of logs to return
 * @returns The response from the database
 */
export async function getWebhookLogs(limit = 50) {
  return supabase
    .from("webhook_logs")
    .select("*, webhooks(url, event_type)")
    .order("created_at", { ascending: false })
    .limit(limit);
}
