import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Get the request body
    const { email, password, userData, role, roleId } = await req.json();

    console.log(`Creating user with email: ${email} and role: ${role}`);

    // Create the user with the admin client
    const { data: authData, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userData,
      });

    if (createUserError) {
      console.error("Error creating user:", createUserError);
      return new Response(JSON.stringify({ error: createUserError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ error: "Failed to create user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`User created with ID: ${authData.user.id}`);

    // Create user record in public.users table
    const { error: userError } = await supabaseAdmin.from("users").insert({
      id: authData.user.id,
      email,
      full_name: userData.full_name,
      role_id: roleId,
    });

    if (userError) {
      console.error("Error creating user record:", userError);
      return new Response(JSON.stringify({ error: userError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        message: "User created successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
