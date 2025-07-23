// create-storage-buckets Edge Function
// This function creates necessary storage buckets if they don't exist

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // List of buckets to ensure exist
    const requiredBuckets = [
      { name: "selfies", isPublic: true },
      { name: "vehicle-inspections", isPublic: true },
      { name: "customers", isPublic: true },
      { name: "drivers", isPublic: true },
      { name: "cars", isPublic: true },
    ];

    const results = [];

    // Check and create each bucket if needed
    for (const bucket of requiredBuckets) {
      try {
        // Check if bucket exists
        const { data: existingBucket, error: getBucketError } =
          await supabase.storage.getBucket(bucket.name);

        if (getBucketError) {
          // Bucket doesn't exist, create it
          const { data: newBucket, error: createError } =
            await supabase.storage.createBucket(bucket.name, {
              public: bucket.isPublic,
            });

          if (createError) {
            results.push({
              bucket: bucket.name,
              status: "error",
              message: createError.message,
            });
          } else {
            results.push({
              bucket: bucket.name,
              status: "created",
              public: bucket.isPublic,
            });
          }
        } else {
          // Bucket exists, update public setting if needed
          if (existingBucket.public !== bucket.isPublic) {
            const { error: updateError } = await supabase.storage.updateBucket(
              bucket.name,
              {
                public: bucket.isPublic,
              },
            );

            if (updateError) {
              results.push({
                bucket: bucket.name,
                status: "update_error",
                message: updateError.message,
              });
            } else {
              results.push({
                bucket: bucket.name,
                status: "updated",
                public: bucket.isPublic,
              });
            }
          } else {
            results.push({
              bucket: bucket.name,
              status: "exists",
              public: existingBucket.public,
            });
          }
        }
      } catch (error) {
        results.push({
          bucket: bucket.name,
          status: "error",
          message: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Storage buckets check completed",
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
