import React, { useEffect, useRef } from "react";
// @ts-ignore - mapbox-gl types may not be available
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// Set Mapbox access token
mapboxgl.accessToken =
  "pk.eyJ1IjoidHJhdmVsaW50cmlwcyIsImEiOiJjbWNib2VqaWwwNzZoMmtvNmYxd3htbTFhIn0.9rFe8T88zhYh--wZDSumsQ";

interface MapPickerProps {
  fromLocation: [number, number];
  toLocation: [number, number];
}

export default function MapPicker({
  fromLocation,
  toLocation,
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<mapboxgl.Map | null>(null);
  const isInitialized = useRef(false);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || isInitialized.current) return;

    const isValidCoord = ([lat, lng]: [number, number]) =>
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat !== 0 &&
      lng !== 0;

    if (!isValidCoord(fromLocation) || !isValidCoord(toLocation)) {
      console.warn("⚠️ Invalid coordinates:", { fromLocation, toLocation });
      return;
    }

    console.log("📦 Initializing Mapbox GL JS...");

    // Calculate center point
    const centerLat = (fromLocation[0] + toLocation[0]) / 2;
    const centerLng = (fromLocation[1] + toLocation[1]) / 2;

    // Create map
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [centerLng, centerLat],
      zoom: 12,
    });

    mapInstanceRef.current = map;
    isInitialized.current = true;

    map.on("load", () => {
      console.log("✅ Mapbox map loaded");
      addMarkersAndRoute(map);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      isInitialized.current = false;
    };
  }, []);

  // Watch location changes
  useEffect(() => {
    const isValidCoord = ([lat, lng]: [number, number]) =>
      typeof lat === "number" &&
      typeof lng === "number" &&
      lat !== 0 &&
      lng !== 0;

    if (
      !mapInstanceRef.current ||
      !isValidCoord(fromLocation) ||
      !isValidCoord(toLocation)
    ) {
      return;
    }

    updateRoute();
  }, [fromLocation, toLocation]);

  const addMarkersAndRoute = (map: mapboxgl.Map) => {
    // Add pickup marker (green)
    const pickupMarker = document.createElement("div");
    pickupMarker.className = "pickup-marker";
    pickupMarker.style.cssText = `
      background-color: #4CAF50;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
    `;

    new mapboxgl.Marker(pickupMarker)
      .setLngLat([fromLocation[1], fromLocation[0]])
      .addTo(map);

    // Add dropoff marker (red)
    const dropoffMarker = document.createElement("div");
    dropoffMarker.className = "dropoff-marker";
    dropoffMarker.style.cssText = `
      background-color: #F44336;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 5px rgba(0,0,0,0.3);
    `;

    new mapboxgl.Marker(dropoffMarker)
      .setLngLat([toLocation[1], toLocation[0]])
      .addTo(map);

    // Add route using Mapbox Directions API
    addRoute(map);

    // Fit bounds to show both markers
    const bounds = new mapboxgl.LngLatBounds()
      .extend([fromLocation[1], fromLocation[0]])
      .extend([toLocation[1], toLocation[0]]);

    map.fitBounds(bounds, { padding: 50 });
  };

  const addRoute = async (map: mapboxgl.Map) => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLocation[1]},${fromLocation[0]};${toLocation[1]},${toLocation[0]}?geometries=geojson&access_token=${mapboxgl.accessToken}`,
      );

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distanceKm = route.distance / 1000;
        const durationMin = route.duration / 60;

        console.log(
          "✅ Route found:",
          distanceKm.toFixed(2),
          "km,",
          durationMin.toFixed(1),
          "minutes",
        );

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
            "line-color": "#0066FF",
            "line-width": 6,
            "line-opacity": 0.8,
          },
        });
      }
    } catch (error) {
      console.error("❌ Failed to fetch route:", error);
    }
  };

  const updateRoute = () => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    const markers = document.querySelectorAll(
      ".pickup-marker, .dropoff-marker",
    );
    markers.forEach((marker) => marker.remove());

    // Add new markers and route
    addMarkersAndRoute(map);
  };

  return (
    <div
      ref={mapRef}
      className="w-full h-[200px] sm:h-[250px] md:h-[300px] rounded-md overflow-hidden"
    />
  );
}
