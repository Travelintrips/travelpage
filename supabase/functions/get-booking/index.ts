import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
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

    // Parse URL to get booking ID if present
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const vehicleId = url.searchParams.get("vehicle_id");
    const status = url.searchParams.get("status");

    // Build query - use proper join syntax
    let query = supabase.from("bookings").select(`
      *,
      vehicles!inner(
        id,
        make,
        model,
        year,
        type,
        category,
        price,
        image,
        license_plate,
        seats,
        transmission,
        fuel_type,
        available,
        status,
        features
      )
    `);

    // Apply filters if provided
    if (id) {
      query = query.eq("id", id);
    } else {
      // If no specific ID, filter by user_id for security
      // Admin users could bypass this check with a special role
      query = query.eq("user_id", user.id);

      if (vehicleId) {
        query = query.eq("vehicle_id", vehicleId);
      }

      if (status) {
        query = query.eq("status", status);
      }
    }

    // Execute query
    const { data, error } = await query;

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
      status: 200,
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
