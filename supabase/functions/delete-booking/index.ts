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

    // Parse URL to get booking ID
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ error: "Booking ID is required" }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 400,
      });
    }

    // Verify user owns this booking or is admin
    const { data: bookingCheck, error: bookingCheckError } = await supabase
      .from("bookings")
      .select("user_id")
      .eq("id", id)
      .single();

    if (bookingCheckError) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 404,
      });
    }

    // Check if user is authorized to delete this booking
    // In a real app, you'd check for admin role too
    if (bookingCheck.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Not authorized to delete this booking" }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          status: 403,
        },
      );
    }

    // Delete booking from database
    const { data, error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 400,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Booking deleted successfully",
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        status: 200,
      },
    );
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
