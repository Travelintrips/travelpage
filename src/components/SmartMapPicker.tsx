import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { loadGoogleMapsScript } from "@/utils/loadGoogleMapsScript";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Set Mapbox access token
mapboxgl.accessToken =
  "pk.eyJ1IjoidHJhdmVsaW50cmlwcyIsImEiOiJjbWNib2VqaWwwNzZoMmtvNmYxd3htbTFhIn0.9rFe8T88zhYh--wZDSumsQ";

type MapMode = "mapbox" | "google" | "static";

interface SmartMapPickerProps {
  pickup: [number, number];
  dropoff: [number, number];
  forceMode?: MapMode;
}

export default function SmartMapPicker({
  pickup,
  dropoff,
  forceMode,
}: SmartMapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const isComponentMountedRef = useRef(true);
  const cleanupInProgressRef = useRef(false);

  const [mapMode, setMapMode] = useState<MapMode>("mapbox");
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Ambil Google Maps API key dari Supabase
  useEffect(() => {
    const fetchKey = async () => {
      const { data, error } = await supabase
        .from("api_settings")
        .select("google_maps_key")
        .eq("id", 1)
        .single();

      if (error) {
        console.error("Failed to load Google Maps key", error);
      } else {
        setApiKey(data.google_maps_key);
      }
    };

    fetchKey();
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase
        .from("api_settings")
        .select("google_maps_key")
        .eq("id", 1)
        .single();

      if (error || !data?.google_maps_key) {
        console.error("❌ Gagal ambil API key dari Supabase", error);
        return;
      }

      try {
        await loadGoogleMapsScript(data.google_maps_key);
        console.log("🎉 Google Maps siap digunakan");
      } catch (e) {
        console.error("❌ Gagal memuat Google Maps", e);
      }
    };

    init();
  }, []);

  // Mode peta
  useEffect(() => {
    if (forceMode) {
      setMapMode(forceMode);
    } else if ((navigator as any).connection?.saveData) {
      setMapMode("static");
    } else {
      setMapMode("mapbox");
    }
  }, [forceMode]);

  // Cleanup function
  useEffect(() => {
    return () => {
      isComponentMountedRef.current = false;

      if (cleanupInProgressRef.current) {
        return;
      }
      cleanupInProgressRef.current = true;

      // Clean up map instance
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.warn("Error removing map:", error);
        }
        mapInstanceRef.current = null;
      }

      cleanupInProgressRef.current = false;
    };
  }, []);

  // Load peta setelah posisi valid dan API key ada
  useEffect(() => {
    if (
      !pickup ||
      !dropoff ||
      pickup[0] === 0 ||
      dropoff[0] === 0 ||
      !mapRef.current
    )
      return;

    if (mapMode === "mapbox") {
      loadMapbox();
    } else if (mapMode === "google" && apiKey) {
      loadGoogleMap();
    }
  }, [mapMode, pickup, dropoff, apiKey]);

  const loadMapbox = () => {
    if (!isComponentMountedRef.current || cleanupInProgressRef.current) {
      return;
    }

    // Clean up existing map
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (error) {
        console.warn("Error removing existing map:", error);
      }
    }

    // Don't continue if component unmounted during cleanup
    if (!isComponentMountedRef.current || cleanupInProgressRef.current) {
      return;
    }

    const centerLat = (pickup[0] + dropoff[0]) / 2;
    const centerLng = (pickup[1] + dropoff[1]) / 2;

    const map = new mapboxgl.Map({
      container: mapRef.current!,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [centerLng, centerLat],
      zoom: 12,
    });

    mapInstanceRef.current = map;

    map.on("load", () => {
      if (!isComponentMountedRef.current || cleanupInProgressRef.current) {
        return;
      }

      // Add pickup marker (green)
      const pickupMarker = document.createElement("div");
      pickupMarker.className = "pickup-marker";
      pickupMarker.style.cssText = `
        background-color: #4CAF50;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
      `;

      new mapboxgl.Marker(pickupMarker)
        .setLngLat([pickup[1], pickup[0]])
        .addTo(map);

      // Add dropoff marker (red)
      const dropoffMarker = document.createElement("div");
      dropoffMarker.className = "dropoff-marker";
      dropoffMarker.style.cssText = `
        background-color: #F44336;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 5px rgba(0,0,0,0.3);
      `;

      new mapboxgl.Marker(dropoffMarker)
        .setLngLat([dropoff[1], dropoff[0]])
        .addTo(map);

      // Add route using Mapbox Directions API
      addRoute(map);

      // Fit bounds to show both markers
      const bounds = new mapboxgl.LngLatBounds()
        .extend([pickup[1], pickup[0]])
        .extend([dropoff[1], dropoff[0]]);

      map.fitBounds(bounds, { padding: 50 });
    });
  };

  const addRoute = async (map: mapboxgl.Map) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup[1]},${pickup[0]};${dropoff[1]},${dropoff[0]}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
      );

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];

        // Remove existing route layer if it exists
        if (map.getLayer("route")) {
          map.removeLayer("route");
        }
        if (map.getSource("route")) {
          map.removeSource("route");
        }

        // Add route layer
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: route.geometry,
          },
        });

        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#3388ff",
            "line-width": 4,
            "line-opacity": 0.7,
          },
        });
      }
    } catch (error) {
      console.error("❌ Failed to fetch route:", error);
    }
  };

  const loadGoogleMap = () => {
    if (document.getElementById("google-maps-script")) {
      initGoogleMap();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;

    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleMap();
    document.body.appendChild(script);
  };

  const initGoogleMap = () => {
    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: {
        lat: (pickup[0] + dropoff[0]) / 2,
        lng: (pickup[1] + dropoff[1]) / 2,
      },
      zoom: 13,
    });

    new (window as any).google.maps.Marker({
      position: { lat: pickup[0], lng: pickup[1] },
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#4CAF50",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
      },
    });

    new (window as any).google.maps.Marker({
      position: { lat: dropoff[0], lng: dropoff[1] },
      map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#F44336",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#ffffff",
      },
    });
  };

  if (!apiKey) return <div>Loading map...</div>;

  if (mapMode === "static") {
    return (
      <img
        src={`https://maps.googleapis.com/maps/api/staticmap?size=600x300&markers=color:green%7C${pickup[0]},${pickup[1]}&markers=color:red%7C${dropoff[0]},${dropoff[1]}&key=${apiKey}`}
        alt="Map preview"
        className="rounded-md border w-full h-[300px] object-cover"
      />
    );
  }

  return (
    <div
      ref={mapRef}
      className="w-full h-[300px] rounded-md overflow-hidden border"
    />
  );
}
