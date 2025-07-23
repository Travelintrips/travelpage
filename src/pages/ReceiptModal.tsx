import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Clock,
  Luggage,
  User,
  Phone,
  Plane,
  Download,
  Share2,
  ShoppingCart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ReceiptModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  bookingDetails?: {
    name?: string;
    phone?: string;
    email?: string;
    contact?: string;
    flightNumber: string;
    baggageSize: "Small" | "Medium" | "Large" | "Electronics";
    price: number;
    duration: number;
    storageLocation: string;
    bookingId: string;
    startTime: Date;
    endTime: Date;
    airport?: string;
    terminal?: string;
    itemName?: string;
    onModalClose?: () => void;
  };
  onViewMap?: () => void;
}

const ReceiptModal = ({
  isOpen = true,
  onClose = () => {},
  bookingDetails = {
    name: "John Doe",
    phone: "+62 812 3456 7890",
    flightNumber: "GA-421",
    baggageSize: "Medium" as const,
    price: 90000,
    duration: 4,
    storageLocation: "Terminal 3, Level 2, Area B",
    bookingId: "BG-" + Math.floor(100000 + Math.random() * 900000),
    startTime: new Date(),
    endTime: new Date(Date.now() + 4 * 60 * 1000),
  },
  onViewMap = () => {},
}: ReceiptModalProps) => {
  const navigate = useNavigate();
  const formatDate = (date: Date) => {
    return date.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleClose = () => {
    console.log("[ReceiptModal] handleClose called");
    // Call the form clearing callback if provided
    if (bookingDetails?.onModalClose) {
      console.log("[ReceiptModal] Calling onModalClose callback");
      try {
        bookingDetails.onModalClose();
        console.log(
          "[ReceiptModal] onModalClose callback executed successfully",
        );
      } catch (error) {
        console.error("[ReceiptModal] Error in onModalClose callback:", error);
      }
    } else {
      console.log("[ReceiptModal] No onModalClose callback provided");
    }
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Booking Receipt
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center mb-6">
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            {/* QR Code placeholder */}
            <div className="w-48 h-48 bg-white p-2 flex items-center justify-center border border-gray-300">
              <img
                src={`https://api.dicebear.com/7.x/identicon/svg?seed=${bookingDetails.bookingId}`}
                alt="QR Code"
                className="w-full h-full"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Scan this QR code to retrieve your baggage
          </p>
          <h3 className="text-xl font-bold mt-2">{bookingDetails.bookingId}</h3>
        </div>

        <Card className="border border-gray-200">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Luggage className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">Baggage Size</span>
                </div>
                <span className="font-semibold">
                  {bookingDetails.baggageSize}
                </span>
              </div>

              {bookingDetails.baggageSize === "Electronics" && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Luggage className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="font-medium">Item Name</span>
                  </div>
                  <span className="font-semibold">
                    {bookingDetails.itemName || "Electronic Device"}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">Duration</span>
                </div>
                <span className="font-semibold">
                  {bookingDetails.duration} hours
                </span>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">Name</span>
                </div>
                <span>{bookingDetails.name || ""}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">Phone</span>
                </div>
                <span>{bookingDetails.phone || ""}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Plane className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">Flight Number</span>
                </div>
                <span>{bookingDetails.flightNumber}</span>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">Airport</span>
                </div>
                <span>
                  {bookingDetails.airport ||
                    "Soekarno Hatta International Airport"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">Terminal</span>
                </div>
                <span>{bookingDetails.terminal || "Terminal 3 Domestik"}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  <span className="font-medium">Storage Location</span>
                </div>
                <span>{bookingDetails.storageLocation}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium">Drop-off Time</span>
                <span>{formatDate(bookingDetails.startTime)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium">Pick-up Time</span>
                <span>{formatDate(bookingDetails.endTime)}</span>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg">
                <span className="font-bold">Total Price</span>
                <span className="font-bold text-blue-700">
                  {formatPrice(bookingDetails.price)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => window.print()}
          >
            <Download size={18} />
            Save Receipt
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() =>
              navigator.share &&
              navigator
                .share({
                  title: "Baggage Storage Receipt",
                  text: `Receipt ID: ${bookingDetails.bookingId}`,
                })
                .catch(() => {})
            }
          >
            <Share2 size={18} />
            Share
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={handleClose}
          >
            Close
          </Button>
          <Button
            className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => {
              handleClose();
              navigate("/cart");
            }}
          >
            <ShoppingCart size={18} />
            View Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptModal;
