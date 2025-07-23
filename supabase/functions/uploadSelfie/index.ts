// supabase/functions/supabase-functions-uploadSelfie/index.ts
console.log("ENV SUPABASE_URL:", Deno.env.get("SUPABASE_URL"));
console.log(
  "ENV SERVICE_KEY exists:",
  !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);
console.log("🟢 SERVICE KEY:", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
console.log("🔥 uploadSelfie invoked at", new Date().toISOString());
console.log("🔥 uploadSelfie STARTED");
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

// Init Supabase Client with Service Role
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  {
    global: {
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

// Helper function for JSON response with CORS headers
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

serve(async (req) => {
  // Handle preflight request (CORS OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    const { base64Image, fileName } = await req.json();
    if (!base64Image || !fileName) {
      return jsonResponse(
        {
          error: "Missing base64Image or fileName",
        },
        400,
      );
    }

    const buffer = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0));
    const uploadResult = await supabase.storage
      .from("selfies")
      .upload(fileName, buffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    console.log("📤 Upload result:", uploadResult);
    if (uploadResult.error) {
      console.error("❌ Upload Error Detail:", uploadResult.error);
      return jsonResponse(
        {
          error: uploadResult.error.message,
        },
        400,
      );
    }

    const { data: urlData } = supabase.storage
      .from("selfies")
      .getPublicUrl(fileName);

    return jsonResponse({
      publicUrl: urlData.publicUrl,
    });
  } catch (err) {
    console.error("❌ Error processing request:", err);
    return jsonResponse(
      {
        error: err.message,
      },
      500,
    );
  }
});
