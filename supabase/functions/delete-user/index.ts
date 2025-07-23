// delete-user Edge Function
// This function deletes a user from auth.users and public.users

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";
// Import Database type from local types
type Database = any; // Temporary type until proper types are available

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  userId: string;
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

    // Parse request body
    const { userId } = (await req.json()) as DeleteUserRequest;

    if (!userId) {
      throw new Error("Missing required field: userId is required");
    }

    // Call the SQL function to delete the user from auth.users
    const { error: functionError } = await supabase.rpc("delete_user_by_id", {
      user_id: userId,
    });

    if (functionError) {
      throw new Error(
        `Failed to delete user from auth: ${functionError.message}`,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "User deleted successfully",
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
