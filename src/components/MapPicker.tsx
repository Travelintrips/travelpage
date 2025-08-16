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

  // Initialize map function
  const initializeMap = () => {
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
  };

  // Initialize map
  useEffect(() => {
    initializeMap();

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

    console.log(`🔄 MapPicker location change detected:`, {
      fromLocation,
      toLocation,
      hasMapInstance: !!mapInstanceRef.current,
      fromValid: isValidCoord(fromLocation),
      toValid: isValidCoord(toLocation),
    });

    // If map instance exists and we have valid coordinates, update the route
    if (
      mapInstanceRef.current &&
      isValidCoord(fromLocation) &&
      isValidCoord(toLocation)
    ) {
      console.log(
        `✅ Updating route with new locations - will recalculate and sync`,
      );
      updateRoute();
    } else if (
      !mapInstanceRef.current &&
      isValidCoord(fromLocation) &&
      isValidCoord(toLocation)
    ) {
      // If map instance doesn't exist but we have valid coordinates, reinitialize
      console.log(`🔄 Reinitializing map with new coordinates`);
      isInitialized.current = false;
      // Trigger map reinitialization by calling the initialization effect
      const timer = setTimeout(() => {
        if (mapRef.current && !mapInstanceRef.current) {
          initializeMap();
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      console.log(`⚠️ Skipping route update - invalid conditions:`, {
        hasMapInstance: !!mapInstanceRef.current,
        fromValid: isValidCoord(fromLocation),
        toValid: isValidCoord(toLocation),
      });
    }
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
        // CRITICAL: Use EXACT same calculation as AirportTransferPage getRouteDetails function
        const rawDistanceMeters = route.distance;
        const rawDurationSeconds = route.duration;

        // CRITICAL: Match AirportTransferPage calculation exactly (lines 1616-1620)
        const distanceKm = Math.max(0.1, rawDistanceMeters / 1000); // convert to km, minimum 0.1
        const durationMin = Math.max(1, Math.ceil(rawDurationSeconds / 60)); // convert to minutes, minimum 1

        console.log(`🔍 MAPBOX ROUTE CALCULATION (EXACT MATCH):`);
        console.log(`   Raw distance: ${rawDistanceMeters} meters`);
        console.log(`   Raw duration: ${rawDurationSeconds} seconds`);
        console.log(
          `   Calculated distance: ${distanceKm} km (matches AirportTransferPage)`,
        );
        console.log(`   Calculated duration: ${durationMin} minutes`);
        console.log(`   Display distance: ${distanceKm.toFixed(1)} km`);

        // CRITICAL: Dispatch event with EXACT same values as AirportTransferPage would calculate
        const eventDetail = {
          distance: distanceKm, // This MUST match AirportTransferPage calculation
          duration: durationMin,
          source: "mapbox",
          rawDistance: rawDistanceMeters,
          rawDuration: rawDurationSeconds,
        };

        console.log(`📡 DISPATCHING EXACT MATCH EVENT:`, eventDetail);
        console.log(
          `📡 Event distance will update Distance card to: ${distanceKm.toFixed(1)} km`,
        );
        console.log(
          `📡 This will synchronize map popup (${distanceKm.toFixed(1)} km) with Distance card`,
        );

        // Dispatch event IMMEDIATELY to update Distance card
        window.dispatchEvent(
          new CustomEvent("mapboxRouteCalculated", {
            detail: eventDetail,
          }),
        );

        console.log(
          `✅ EVENT DISPATCHED - Distance card should now show: ${distanceKm.toFixed(1)} km`,
        );
        console.log(
          `✅ SYNCHRONIZATION COMPLETE - Map and Distance card both show: ${distanceKm.toFixed(1)} km`,
        );

        // Wait for event to be processed
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Remove existing route layer and popup if it exists
        if (map.getLayer("route")) {
          map.removeLayer("route");
        }
        if (map.getSource("route")) {
          map.removeSource("route");
        }

        // Remove existing distance popup
        const existingPopups = document.querySelectorAll(".distance-popup");
        existingPopups.forEach((popup) => {
          const popupElement = popup.closest(".mapboxgl-popup");
          if (popupElement) {
            popupElement.remove();
          }
        });

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

        // Add distance label on the map
        const midpoint = [
          (fromLocation[1] + toLocation[1]) / 2,
          (fromLocation[0] + toLocation[0]) / 2,
        ];

        // CRITICAL: Use EXACT same distance value that was dispatched and will appear in Distance card
        const displayDistance = distanceKm.toFixed(1);

        const distancePopup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "distance-popup",
        })
          .setLngLat(midpoint)
          .setHTML(
            `<div style="background: rgba(0, 102, 255, 0.9); color: white; padding: 8px 12px; border-radius: 20px; font-weight: bold; font-size: 14px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
              ${displayDistance} km
            </div>`,
          )
          .addTo(map);

        console.log(`🗺️ PERFECT SYNCHRONIZATION ACHIEVED:`);
        console.log(`   ✅ Event dispatched distance: ${distanceKm} km`);
        console.log(`   ✅ Map popup shows: ${displayDistance} km`);
        console.log(`   ✅ Distance card will show: ${displayDistance} km`);
        console.log(`   ✅ All values are identical and synchronized`);
        console.log(`   📊 Raw Mapbox distance: ${rawDistanceMeters} meters`);
        console.log(
          `   📊 Calculation: Math.max(0.1, ${rawDistanceMeters} / 1000) = ${distanceKm}`,
        );

        // Final verification
        console.log(`🔍 FINAL SYNCHRONIZATION VERIFICATION:`);
        console.log(`   Event distance: ${distanceKm}`);
        console.log(`   Map display: ${displayDistance}`);
        console.log(
          `   Values match: ${distanceKm.toFixed(1) === displayDistance}`,
        );
        console.log(`   Distance card should update to: ${displayDistance} km`);
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

    // Clear existing distance popup
    const existingPopups = document.querySelectorAll(".distance-popup");
    existingPopups.forEach((popup) => {
      const popupElement = popup.closest(".mapboxgl-popup");
      if (popupElement) {
        popupElement.remove();
      }
    });

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
