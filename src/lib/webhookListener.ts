import { supabase } from "./supabase";

/**
 * Webhook configuration interface
 */
export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
  events: string[]; // e.g., ['bookings.insert', 'payments.update']
}

/**
 * Process webhook notifications by making HTTP requests to configured endpoints
 * @param payload The notification payload
 * @param config The webhook configuration
 */
export const processWebhook = async (
  payload: {
    table: string;
    action: "INSERT" | "UPDATE" | "DELETE";
    record: any;
  },
  config: WebhookConfig,
): Promise<void> => {
  const eventName = `${payload.table}.${payload.action.toLowerCase()}`;

  // Check if this event should trigger the webhook
  if (!config.events.includes(eventName)) {
    console.log(`Event ${eventName} not configured for webhook`);
    return;
  }

  try {
    // Use the database function to send the HTTP request
    const { data, error } = await supabase.rpc("send_http_request", {
      url: config.url,
      method: "POST",
      headers: config.headers || {},
      payload: {
        event: eventName,
        data: payload.record,
        timestamp: new Date().toISOString(),
      },
    });

    if (error) {
      console.error("Error sending webhook:", error);
    } else {
      console.log("Webhook sent successfully:", data);
    }
  } catch (error) {
    console.error("Exception sending webhook:", error);
  }
};

/**
 * Set up a webhook listener for database events
 * @param config The webhook configuration
 */
export const setupWebhookListener = async (
  config: WebhookConfig,
): Promise<() => void> => {
  // Subscribe to the webhook channel
  const subscription = supabase
    .channel("webhook_notifications")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
      },
      (payload) => {
        // Process the webhook notification
        const webhookPayload = {
          table: payload.table,
          action: payload.eventType.toUpperCase() as
            | "INSERT"
            | "UPDATE"
            | "DELETE",
          record: payload.new,
        };

        processWebhook(webhookPayload, config);
      },
    )
    .subscribe();

  // Return a function to unsubscribe
  return () => {
    subscription.unsubscribe();
  };
};

/**
 * Example usage:
 *
 * const unsubscribe = await setupWebhookListener({
 *   url: 'https://your-webhook-endpoint.com/hook',
 *   headers: { 'Authorization': 'Bearer your-token' },
 *   events: ['bookings.insert', 'payments.update', 'payments.insert']
 * });
 *
 * // Later, to stop listening:
 * unsubscribe();
 */
