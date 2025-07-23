import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, ZoomIn, ZoomOut } from "lucide-react";

interface StorageLocation {
  id: string;
  name: string;
  description: string;
  coordinates: { x: number; y: number };
  isSelected?: boolean;
  terminal?: string;
  airport?: string;
}

interface AirportMapProps {
  selectedLocationId?: string;
  onLocationSelect?: (locationId: string) => void;
  onClose?: () => void;
  storageLocation?: string | null;
}

const AirportMap = ({
  selectedLocationId = "1",
  onLocationSelect = () => {},
  onClose = () => {},
  storageLocation = null,
}: AirportMapProps) => {
  const [zoom, setZoom] = useState<number>(1);
  const [selectedAirport, setSelectedAirport] =
    useState<string>("soekarno_hatta");

  // Soekarno Hatta airport storage locations data
  const storageLocations: StorageLocation[] = [
    {
      id: "1",
      name: "Terminal 1A Storage",
      description: "Located near Gate A3, Terminal 1A",
      coordinates: { x: 120, y: 100 },
      isSelected: selectedLocationId === "1",
      terminal: "1A",
      airport: "soekarno_hatta",
    },
    {
      id: "2",
      name: "Terminal 1B Storage",
      description: "Located near Information Desk, Terminal 1B",
      coordinates: { x: 220, y: 150 },
      isSelected: selectedLocationId === "2",
      terminal: "1B",
      airport: "soekarno_hatta",
    },
    {
      id: "3",
      name: "Terminal 2D Storage",
      description: "Located near Food Court, Terminal 2D",
      coordinates: { x: 320, y: 180 },
      isSelected: selectedLocationId === "3",
      terminal: "2D",
      airport: "soekarno_hatta",
    },
    {
      id: "4",
      name: "Terminal 2E Storage",
      description: "Located near Gate E7, Terminal 2E",
      coordinates: { x: 380, y: 220 },
      isSelected: selectedLocationId === "4",
      terminal: "2E",
      airport: "soekarno_hatta",
    },
    {
      id: "5",
      name: "Terminal 2F Storage",
      description: "Located near Security Check, Terminal 2F",
      coordinates: { x: 450, y: 250 },
      isSelected: selectedLocationId === "5",
      terminal: "2F",
      airport: "soekarno_hatta",
    },
    {
      id: "6",
      name: "Terminal 3 Domestik Storage",
      description: "Located near Domestic Departure Area, Terminal 3",
      coordinates: { x: 520, y: 150 },
      isSelected: selectedLocationId === "6",
      terminal: "3 DOMESTIK",
      airport: "soekarno_hatta",
    },
    {
      id: "7",
      name: "Terminal 3 Internasional Storage",
      description: "Located near International Departure Area, Terminal 3",
      coordinates: { x: 580, y: 200 },
      isSelected: selectedLocationId === "7",
      terminal: "3 INTERNASIONAL",
      airport: "soekarno_hatta",
    },
  ];

  const handleZoomIn = () => {
    if (zoom < 1.5) setZoom(zoom + 0.1);
  };

  const handleZoomOut = () => {
    if (zoom > 0.8) setZoom(zoom - 0.1);
  };

  const handleLocationClick = (locationId: string) => {
    onLocationSelect(locationId);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Soekarno Hatta Airport
            </h2>
            <p className="text-sm text-gray-600">Storage Locations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Close Map
              </Button>
            )}
          </div>
        </div>

        <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-blue-50 h-[500px]">
          {/* Airport map background */}
          <div
            className="relative w-full h-full"
            style={{
              backgroundImage: `url(https://images.unsplash.com/photo-1588412079929-790b9f593d8e?w=1200&q=80)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              transform: `scale(${zoom})`,
              transition: "transform 0.3s ease",
            }}
          >
            {/* Storage location markers */}
            {storageLocations.map((location) => (
              <div
                key={location.id}
                className={`absolute cursor-pointer transition-all duration-300 ${location.isSelected ? "z-10 scale-125" : "z-0 hover:scale-110"}`}
                style={{
                  left: `${location.coordinates.x}px`,
                  top: `${location.coordinates.y}px`,
                }}
                onClick={() => handleLocationClick(location.id)}
              >
                <div className="flex flex-col items-center">
                  <MapPin
                    className={`h-8 w-8 ${location.isSelected ? "text-red-500 animate-bounce" : "text-blue-600"}`}
                    fill={
                      location.isSelected
                        ? "rgba(239, 68, 68, 0.2)"
                        : "rgba(37, 99, 235, 0.2)"
                    }
                  />
                  <div
                    className={`
                    px-2 py-1 rounded-md text-xs font-medium shadow-sm
                    ${location.isSelected ? "bg-red-500 text-white" : "bg-white text-gray-800"}
                  `}
                  >
                    {location.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected location details */}
        {selectedLocationId && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Navigation className="h-5 w-5 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-gray-800">
                  {
                    storageLocations.find(
                      (loc) => loc.id === selectedLocationId,
                    )?.name
                  }
                </h3>
                <p className="text-sm text-gray-600">
                  {
                    storageLocations.find(
                      (loc) => loc.id === selectedLocationId,
                    )?.description
                  }
                </p>
                <div className="mt-2">
                  <Button size="sm" variant="outline" className="text-xs">
                    Get Directions
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          <p>
            Tap on a location marker to see details. Use the zoom buttons to
            adjust the map view.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="font-semibold">Available terminals:</span>
            {[
              "1A",
              "1B",
              "2D",
              "2E",
              "2F",
              "3 DOMESTIK",
              "3 INTERNASIONAL",
            ].map((terminal) => (
              <span
                key={terminal}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs"
              >
                {terminal}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AirportMap;
