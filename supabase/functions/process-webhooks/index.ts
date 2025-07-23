// process-webhooks Edge Function
// This function processes queued webhooks and sends them using fetch API

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

type Database = any; // Temporary type until proper types are available

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WebhookLog {
  id: number;
  webhook_id: number;
  event_type: string;
  payload: any;
  status: string;
  response_body?: string;
  created_at: string;
}

interface Webhook {
  id: number;
  url: string;
  event_type: string;
  is_active: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables for Supabase connection");
    }

    // Create Supabase client with admin privileges
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Get pending webhooks
    const { data: pendingWebhooks, error: fetchError } = await supabase
      .from("webhook_logs")
      .select("*, webhooks!inner(*)")
      .eq("status", "queued_for_processing")
      .limit(10); // Process in batches

    if (fetchError) {
      throw new Error(
        `Failed to fetch pending webhooks: ${fetchError.message}`,
      );
    }

    if (!pendingWebhooks || pendingWebhooks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending webhooks to process",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Process each webhook
    const results = await Promise.all(
      pendingWebhooks.map(async (log: any) => {
        const webhook = log.webhooks;
        const webhookId = log.id;

        try {
          // Use fetch API to send the webhook
          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(log.payload),
          });

          const responseText = await response.text();
          const status = response.ok ? "delivered" : "failed";

          // Update the webhook log
          await supabase
            .from("webhook_logs")
            .update({
              status: status,
              response_body: responseText,
            })
            .eq("id", webhookId);

          return {
            id: webhookId,
            status: status,
            response: responseText,
          };
        } catch (error) {
          // Update the webhook log with the error
          await supabase
            .from("webhook_logs")
            .update({
              status: "failed",
              response_body: error.message,
            })
            .eq("id", webhookId);

          return {
            id: webhookId,
            status: "failed",
            error: error.message,
          };
        }
      }),
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.length} webhooks`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
