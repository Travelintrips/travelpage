import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const { place_id } = await req.json();

    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!place_id || !apiKey) {
      return new Response(JSON.stringify({ error: "Missing place_id or API key" }), { status: 400 });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
  }
});
