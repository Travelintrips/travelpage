import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Eye,
  CreditCard,
  Car,
  Activity,
  ClipboardCheck,
  Search,
  X,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import PostRentalInspectionForm from "@/components/booking/PostRentalInspectionForm";
import PickupCustomer from "@/components/booking/PickupCustomer";
import PreRentalInspectionForm from "@/components/booking/PreRentalInspectionForm";
import { format } from "date-fns";
import { useLocation, useNavigate } from "react-router-dom";
import { cn, formatDate } from "@/lib/utils";

interface Booking {
  id: number;
  kode_booking?: string;
  user_id: string;
  vehicle_id: number;
  start_date: string;
  end_date: string;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  pickup_time?: string;
  driver_option?: string;
  driver_id?: number;
  user: {
    full_name: string;
    email: string;
  };
  driver?: {
    id: number;
    full_name: string;
  };
}

interface Payment {
  id: number;
  booking_id: number;
  amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

export default function BookingManagement() {
  // Rest of the code remains unchanged
}
