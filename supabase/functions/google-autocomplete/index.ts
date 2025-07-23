import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  // ✅ Handle Preflight (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  try {
    const { input } = await req.json();
    if (!input) {
      return new Response(JSON.stringify({ error: "Missing input" }), {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key" }), {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${apiKey}&components=country:ID`;

    const res = await fetch(url);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
