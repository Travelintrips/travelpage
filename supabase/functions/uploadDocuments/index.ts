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
    const {
      userId,
      ktpImage,
      simImage,
      idCardImage,
      kkImage,
      stnkImage,
      skckImage,
    } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create the driver_documents bucket if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets.find((bucket) => bucket.name === "driver_documents")) {
      await supabase.storage.createBucket("driver_documents", {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
    }

    // Create the staff_documents bucket if it doesn't exist
    if (!buckets.find((bucket) => bucket.name === "staff_documents")) {
      await supabase.storage.createBucket("staff_documents", {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
    }

    const uploadResults = {
      ktpUrl: "",
      simUrl: "",
      idCardUrl: "",
      kkUrl: "",
      stnkUrl: "",
      skckUrl: "",
    };

    // Upload KTP image if provided
    if (ktpImage) {
      try {
        const ktpBlob = await fetch(ktpImage).then((res) => res.blob());
        const ktpFileName = `ktp_${userId}_${new Date().getTime()}.jpg`;

        const { data: ktpData, error: ktpError } = await supabase.storage
          .from("driver_documents")
          .upload(ktpFileName, ktpBlob);

        if (ktpError) {
          console.error("Error uploading KTP image:", ktpError);
        } else if (ktpData) {
          const { data: ktpUrlData } = supabase.storage
            .from("driver_documents")
            .getPublicUrl(ktpFileName);

          uploadResults.ktpUrl = ktpUrlData.publicUrl;

          // Update the drivers table with the KTP URL
          const { error: updateError } = await supabase
            .from("drivers")
            .update({ ktp_url: ktpUrlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating driver KTP URL:", updateError);
          }
        }
      } catch (error) {
        console.error("Error in KTP upload process:", error);
      }
    }

    // Upload SIM image if provided
    if (simImage) {
      try {
        const simBlob = await fetch(simImage).then((res) => res.blob());
        const simFileName = `sim_${userId}_${new Date().getTime()}.jpg`;

        const { data: simData, error: simError } = await supabase.storage
          .from("driver_documents")
          .upload(simFileName, simBlob);

        if (simError) {
          console.error("Error uploading SIM image:", simError);
        } else if (simData) {
          const { data: simUrlData } = supabase.storage
            .from("driver_documents")
            .getPublicUrl(simFileName);

          uploadResults.simUrl = simUrlData.publicUrl;

          // Update the drivers table with the SIM URL
          const { error: updateError } = await supabase
            .from("drivers")
            .update({ sim_url: simUrlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating driver SIM URL:", updateError);
          }
        }
      } catch (error) {
        console.error("Error in SIM upload process:", error);
      }
    }

    // Upload KK image if provided
    if (kkImage) {
      try {
        const kkBlob = await fetch(kkImage).then((res) => res.blob());
        const kkFileName = `kk_${userId}_${new Date().getTime()}.jpg`;

        const { data: kkData, error: kkError } = await supabase.storage
          .from("driver_documents")
          .upload(kkFileName, kkBlob);

        if (kkError) {
          console.error("Error uploading KK image:", kkError);
        } else if (kkData) {
          const { data: kkUrlData } = supabase.storage
            .from("driver_documents")
            .getPublicUrl(kkFileName);

          uploadResults.kkUrl = kkUrlData.publicUrl;

          // Update the drivers table with the KK URL
          const { error: updateError } = await supabase
            .from("drivers")
            .update({ kk_url: kkUrlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating driver KK URL:", updateError);
          }
        }
      } catch (error) {
        console.error("Error in KK upload process:", error);
      }
    }

    // Upload STNK image if provided
    if (stnkImage) {
      try {
        const stnkBlob = await fetch(stnkImage).then((res) => res.blob());
        const stnkFileName = `stnk_${userId}_${new Date().getTime()}.jpg`;

        const { data: stnkData, error: stnkError } = await supabase.storage
          .from("driver_documents")
          .upload(stnkFileName, stnkBlob);

        if (stnkError) {
          console.error("Error uploading STNK image:", stnkError);
        } else if (stnkData) {
          const { data: stnkUrlData } = supabase.storage
            .from("driver_documents")
            .getPublicUrl(stnkFileName);

          uploadResults.stnkUrl = stnkUrlData.publicUrl;

          // Update the drivers table with the STNK URL
          const { error: updateError } = await supabase
            .from("drivers")
            .update({ stnk_url: stnkUrlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating driver STNK URL:", updateError);
          }
        }
      } catch (error) {
        console.error("Error in STNK upload process:", error);
      }
    }

    // Upload SKCK image if provided
    if (skckImage) {
      try {
        const skckBlob = await fetch(skckImage).then((res) => res.blob());
        const skckFileName = `skck_${userId}_${new Date().getTime()}.jpg`;

        const { data: skckData, error: skckError } = await supabase.storage
          .from("driver_documents")
          .upload(skckFileName, skckBlob);

        if (skckError) {
          console.error("Error uploading SKCK image:", skckError);
        } else if (skckData) {
          const { data: skckUrlData } = supabase.storage
            .from("driver_documents")
            .getPublicUrl(skckFileName);

          uploadResults.skckUrl = skckUrlData.publicUrl;

          // Update the drivers table with the SKCK URL
          const { error: updateError } = await supabase
            .from("drivers")
            .update({ skck_url: skckUrlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating driver SKCK URL:", updateError);
          }
        }
      } catch (error) {
        console.error("Error in SKCK upload process:", error);
      }
    }

    // Upload ID Card image if provided
    if (idCardImage) {
      try {
        const idCardBlob = await fetch(idCardImage).then((res) => res.blob());
        const idCardFileName = `idcard_${userId}_${new Date().getTime()}.jpg`;

        const { data: idCardData, error: idCardError } = await supabase.storage
          .from("staff_documents")
          .upload(idCardFileName, idCardBlob);

        if (idCardError) {
          console.error("Error uploading ID Card image:", idCardError);
        } else if (idCardData) {
          const { data: idCardUrlData } = supabase.storage
            .from("staff_documents")
            .getPublicUrl(idCardFileName);

          uploadResults.idCardUrl = idCardUrlData.publicUrl;

          // Update the staff table with the ID Card URL
          const { error: updateError } = await supabase
            .from("staff")
            .update({ id_card_url: idCardUrlData.publicUrl })
            .eq("id", userId);

          if (updateError) {
            console.error("Error updating staff ID Card URL:", updateError);
          }
        }
      } catch (error) {
        console.error("Error in ID Card upload process:", error);
      }
    }

    return new Response(JSON.stringify(uploadResults), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
