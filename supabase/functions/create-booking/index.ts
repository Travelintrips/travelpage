import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";
import { BookingInsert } from "@shared/types.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
      status: 200,
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          status: 401,
        },
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the current user from the token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", details: userError?.message }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          status: 401,
        },
      );
    }

    // Parse request body
    const bookingData: BookingInsert = await req.json();

    // Add user_id if not provided
    if (!bookingData.user_id) {
      bookingData.user_id = user.id;
    }

    // Add created_at if not provided
    if (!bookingData.created_at) {
      bookingData.created_at = new Date().toISOString();
    }

    // Set is_guest flag - if user is authenticated, it's not a guest
    if (bookingData.is_guest === undefined) {
      bookingData.is_guest = false; // Authenticated users are not guests
    }

    // Insert booking into database
    const { data, error } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ data }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 201,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      status: 500,
    });
  }
});
