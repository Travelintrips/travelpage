import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Luggage } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Car,
  Plane,
  Train,
  Bus,
  Hotel,
  Search,
  CalendarIcon,
  ArrowRightLeft,
  Globe,
  ChevronDown,
  User,
  MapPin,
  Briefcase,
  Compass,
  Menu,
  X,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Clock,
  Star,
  Shield,
  CreditCard,
  Headphones,
  ShoppingCart,
  HandHeart,
} from "lucide-react";
import AuthForm from "@/components/auth/AuthForm";
import UserDropdown from "@/components/UserDropdown";
import ShoppingCartComponent from "@/components/booking/ShoppingCart";
import { useShoppingCart } from "@/hooks/useShoppingCart";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";

// Header Component
const Header = ({
  isAuthenticated,
  showAuthForm,
  setShowAuthForm,
  setAuthFormType,
  currentLanguage,
  currentCurrency,
  setMobileMenuOpen,
  navigate,
}) => {
  const { t } = useTranslation();
  const { cartItems } = useShoppingCart();

  // Language Selector Component
  const LanguageSelector = () => (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center space-x-1 cursor-pointer bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-full transition-colors">
          <span>
            {currentLanguage === "id"
              ? "🇮🇩"
              : currentLanguage === "en"
                ? "🇬🇧"
                : currentLanguage === "fr"
                  ? "🇫🇷"
                  : currentLanguage === "nl"
                    ? "🇳🇱"
                    : currentLanguage === "ru"
                      ? "🇷🇺"
                      : "🇨🇳"}
          </span>
          <span>{currentLanguage.toUpperCase()}</span>
          <span>|</span>
          <span>{currentCurrency.code}</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        <div className="grid gap-2">
          <h3 className="font-medium mb-1">{t("language.select")}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("en");
            }}
          >
            <span className="mr-2">🇬🇧</span> {t("language.en")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("id");
            }}
          >
            <span className="mr-2">🇮🇩</span> {t("language.id")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("fr");
            }}
          >
            <span className="mr-2">🇫🇷</span> {t("language.fr")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("nl");
            }}
          >
            <span className="mr-2">🇳🇱</span> {t("language.nl")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("ru");
            }}
          >
            <span className="mr-2">🇷🇺</span> {t("language.ru")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("zh");
            }}
          >
            <span className="mr-2">🇨🇳</span> {t("language.zh")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <header className="bg-green-800 text-white sticky top-0 z-30 shadow-md">
      {/* Top Bar */}
      <div className="bg-green-900 py-1 px-4 text-xs hidden md:block">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Phone className="h-3 w-3 mr-1" />
              <span>+62 822 9999 7227</span>
            </div>
            <div className="flex items-center">
              <Mail className="h-3 w-3 mr-1" />
              <span>info@travelintrips.com</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Facebook className="h-3 w-3 cursor-pointer hover:text-green-300" />
            <Twitter className="h-3 w-3 cursor-pointer hover:text-green-300" />
            <Instagram className="h-3 w-3 cursor-pointer hover:text-green-300" />
            <Youtube className="h-3 w-3 cursor-pointer hover:text-green-300" />
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto flex justify-between items-center p-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <span className="text-xl font-bold">
              {t("brand", "Travelintrips")}
            </span>
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-6">
          <Button variant="ghost" className="text-white hover:bg-green-700">
            Deals
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="text-white hover:bg-green-700">
                Support <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="grid gap-2">
                <Button variant="ghost" size="sm" className="justify-start">
                  Help Center
                </Button>
                <Button variant="ghost" size="sm" className="justify-start">
                  Contact Us
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="text-white hover:bg-green-700">
                Partnership <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="grid gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    window.open(
                      "https://register.travelinairport.com/",
                      "_blank",
                    )
                  }
                >
                  Driver Mitra
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() =>
                    window.open(
                      "https://register.travelinairport.com/",
                      "_blank",
                    )
                  }
                >
                  Driver Perusahaan
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" className="text-white hover:bg-green-700">
            For Corporates
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start flex items-center"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate("/cart");
            }}
          >
            <ShoppingCart className="h-5 w-5 mr-3" />
            Cart
            {cartItems.length > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-auto">
                {cartItems.length}
              </Badge>
            )}
          </Button>
          {/*  <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setMobileMenuOpen(false)}
          >
            Bookings
          </Button>*/}
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden md:block">
            <LanguageSelector />
          </div>

          {isAuthenticated ? (
            <UserDropdown />
          ) : (
            <div className="hidden md:flex space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent text-white border-white hover:bg-green-700"
                onClick={() => {
                  setShowAuthForm(true);
                  setAuthFormType("login");
                }}
              >
                {t("navbar.signIn")}
              </Button>
              <Button
                size="sm"
                className="bg-green-500 text-white hover:bg-green-600"
                onClick={() => {
                  setShowAuthForm(true);
                  setAuthFormType("register");
                }}
              >
                {t("navbar.register", "Register")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Navigation Component - Now used as a secondary navigation below the hero
const Navigation = ({ activeTab, setActiveTab, handleTravelOptionClick }) => {
  return (
    <nav className="bg-green-900 text-white py-2 border-t border-green-700 overflow-x-auto sticky top-[72px] z-20 shadow-md">
      <div className="container mx-auto flex space-x-1 md:space-x-4 px-2 md:px-4 justify-start">
        <Button
          variant="ghost"
          className={`text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center ${activeTab === "hotels" ? "bg-green-700" : ""}`}
          onClick={() => {
            setActiveTab("hotels");
            handleTravelOptionClick("Hotels");
          }}
        >
          <Hotel className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Hotels
        </Button>
        <Button
          variant="ghost"
          className={`text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center ${activeTab === "flights" ? "bg-green-700" : ""}`}
          onClick={() => {
            setActiveTab("flights");
            handleTravelOptionClick("Flights");
          }}
        >
          <Plane className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Flights
        </Button>
        <Button
          variant="ghost"
          className={`text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center ${activeTab === "trains" ? "bg-green-700" : ""}`}
          onClick={() => {
            setActiveTab("trains");
            handleTravelOptionClick("Trains");
          }}
        >
          <Train className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Trains
        </Button>
        <Button
          variant="ghost"
          className={`text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center ${activeTab === "bus" ? "bg-green-700" : ""}`}
          onClick={() => {
            setActiveTab("bus");
            handleTravelOptionClick("Bus & Travel");
          }}
        >
          <Bus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Bus & Travel
        </Button>
        <Button
          variant="ghost"
          className={`text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center ${activeTab === "airport" ? "bg-green-700" : ""}`}
          onClick={() => {
            setActiveTab("airport");
            handleTravelOptionClick("Airport Transfer");
          }}
        >
          <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Airport
          Transfer
        </Button>
        <Button
          variant="ghost"
          className={`text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center ${activeTab === "car" ? "bg-green-700" : ""}`}
          onClick={() => {
            setActiveTab("car");
            handleTravelOptionClick("Car Rental");
          }}
        >
          <Car className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Car Rental
        </Button>
        <Button
          variant="ghost"
          className={`text-white hover:bg-green-800 cursor-pointer text-xs md:text-sm whitespace-nowrap flex items-center ${activeTab === "activities" ? "bg-green-700" : ""}`}
          onClick={() => {
            setActiveTab("activities");
            handleTravelOptionClick("Things to Do");
          }}
        >
          <Compass className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" /> Activities
        </Button>
      </div>
    </nav>
  );
};

// Mobile Menu Component
const MobileMenu = ({
  setMobileMenuOpen,
  handleTravelOptionClick,
  isAuthenticated,
  setShowAuthForm,
  setAuthFormType,
  currentLanguage,
  currentCurrency,
  navigate,
}) => {
  const { t } = useTranslation();
  const { cartItems } = useShoppingCart();

  // Language Selector Component
  const LanguageSelector = () => (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center space-x-1 cursor-pointer bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-full transition-colors">
          <span>
            {currentLanguage === "id"
              ? "🇮🇩"
              : currentLanguage === "en"
                ? "🇬🇧"
                : currentLanguage === "fr"
                  ? "🇫🇷"
                  : currentLanguage === "nl"
                    ? "🇳🇱"
                    : currentLanguage === "ru"
                      ? "🇷🇺"
                      : "🇨🇳"}
          </span>
          <span>{currentLanguage.toUpperCase()}</span>
          <span>|</span>
          <span>{currentCurrency.code}</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-48">
        <div className="grid gap-2">
          <h3 className="font-medium mb-1">{t("language.select")}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("en");
            }}
          >
            <span className="mr-2">🇬🇧</span> {t("language.en")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("id");
            }}
          >
            <span className="mr-2">🇮🇩</span> {t("language.id")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("fr");
            }}
          >
            <span className="mr-2">🇫🇷</span> {t("language.fr")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("nl");
            }}
          >
            <span className="mr-2">🇳🇱</span> {t("language.nl")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("ru");
            }}
          >
            <span className="mr-2">🇷🇺</span> {t("language.ru")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => {
              i18n.changeLanguage("zh");
            }}
          >
            <span className="mr-2">🇨🇳</span> {t("language.zh")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      <div className="bg-green-800 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-white">
            {t("brand", "Travelintrips")}
          </span>
          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-6 w-6" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto bg-white p-4 space-y-4">
        <div className="flex justify-center mb-4">
          <LanguageSelector />
        </div>
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-lg py-3"
            onClick={() => {
              setMobileMenuOpen(false);
              handleTravelOptionClick("Hotels");
            }}
          >
            <Hotel className="h-5 w-5 mr-3" /> Hotels
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg py-3"
            onClick={() => {
              setMobileMenuOpen(false);
              handleTravelOptionClick("Flights");
            }}
          >
            <Plane className="h-5 w-5 mr-3" /> Flights
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg py-3"
            onClick={() => {
              setMobileMenuOpen(false);
              handleTravelOptionClick("Trains");
            }}
          >
            <Train className="h-5 w-5 mr-3" /> Trains
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg py-3"
            onClick={() => {
              setMobileMenuOpen(false);
              handleTravelOptionClick("Bus & Travel");
            }}
          >
            <Bus className="h-5 w-5 mr-3" /> Bus & Travel
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg py-3"
            onClick={() => {
              setMobileMenuOpen(false);
              handleTravelOptionClick("Airport Transfer");
            }}
          >
            <MapPin className="h-5 w-5 mr-3" /> Airport Transfer
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg py-3"
            onClick={() => {
              setMobileMenuOpen(false);
              handleTravelOptionClick("Car Rental");
            }}
          >
            <Car className="h-5 w-5 mr-3" /> Car Rental
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg py-3"
            onClick={() => {
              setMobileMenuOpen(false);
              handleTravelOptionClick("Things to Do");
            }}
          >
            <Compass className="h-5 w-5 mr-3" /> Things to Do
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg py-3"
            onClick={() => {
              setMobileMenuOpen(false);
              handleTravelOptionClick("Baggage");
            }}
          >
            <Luggage className="h-5 w-5 mr-3" /> Baggage
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-lg py-3"
            onClick={() => {
              setMobileMenuOpen(false);
              handleTravelOptionClick("Handling");
            }}
          >
            <HandHeart className="h-5 w-5 mr-3" /> Handling
          </Button>
        </div>
        <div className="border-t pt-4 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start flex items-center"
            onClick={() => {
              setMobileMenuOpen(false);
              navigate("/cart");
            }}
          >
            <ShoppingCart className="h-5 w-5 mr-3" />
            Cart
            {cartItems.length > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-auto">
                {cartItems.length}
              </Badge>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setMobileMenuOpen(false)}
          >
            Deals
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setMobileMenuOpen(false)}
          >
            Support
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setMobileMenuOpen(false)}
          >
            Partnership
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setMobileMenuOpen(false)}
          >
            For Corporates
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => setMobileMenuOpen(false)}
          >
            Bookings
          </Button>
        </div>
      </div>
      <div className="bg-white p-4 border-t">
        {isAuthenticated ? (
          <div className="flex justify-center">
            <UserDropdown />
          </div>
        ) : (
          <div className="flex flex-col space-y-2">
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-white"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowAuthForm(true);
                setAuthFormType("login");
              }}
            >
              {t("navbar.signIn")}
            </Button>
            <Button
              variant="outline"
              className="w-full border-green-500 text-green-500 hover:bg-green-50"
              onClick={() => {
                setMobileMenuOpen(false);
                setShowAuthForm(true);
                setAuthFormType("register");
              }}
            >
              {t("navbar.register", "Register")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Flight Search Form Component
const FlightSearchForm = ({ handleSearch, t }) => {
  const [fromLocation, setFromLocation] = useState("Jakarta (CGK)");
  const [toLocation, setToLocation] = useState("Bali / Denpasar (DPS)");
  const [departureDate, setDepartureDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(new Date());
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [passengers, setPassengers] = useState("1 Adult, 0 child, 0 infant");
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [infantCount, setInfantCount] = useState(0);
  const [travelClass, setTravelClass] = useState("Economy");

  const swapLocations = () => {
    const temp = fromLocation;
    setFromLocation(toLocation);
    setToLocation(temp);
  };

  return (
    <div className="space-y-6">
      {/* Trip Type */}
      <div className="flex mb-4 space-x-2 overflow-x-auto pb-2 justify-center md:justify-start">
        <Button
          variant="outline"
          className={`rounded-full text-xs md:text-sm whitespace-nowrap font-medium border-gray-300 ${isRoundTrip ? "bg-green-500 text-white" : "text-black"}`}
          onClick={() => setIsRoundTrip(true)}
        >
          {t("airportTransfer.roundTrip", "Round-trip")}
        </Button>
        <Button
          variant="outline"
          className={`rounded-full text-xs md:text-sm whitespace-nowrap font-medium border-gray-300 ${!isRoundTrip ? "bg-green-500 text-white" : "text-black"}`}
          onClick={() => setIsRoundTrip(false)}
        >
          {t("airportTransfer.oneWay", "One-way")}
        </Button>
        <Button
          variant="outline"
          className="rounded-full text-xs md:text-sm whitespace-nowrap font-medium text-black border-gray-300"
        >
          {t("airportTransfer.multiCity", "Multi-city")}
        </Button>
      </div>

      {/* Locations */}
      <div className="relative">
        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <div className="flex items-center mb-1">
              <Plane className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
              <label className="block text-xs md:text-sm text-black font-medium">
                {t("airportTransfer.from", "From")}
              </label>
            </div>
            <Input
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value)}
              className="py-4 md:py-6 text-sm md:text-base text-black"
            />
          </div>

          <div className="relative">
            <div className="flex items-center mb-1">
              <Plane className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
              <label className="block text-xs md:text-sm text-black font-medium">
                {t("airportTransfer.to", "To")}
              </label>
            </div>
            <Input
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value)}
              className="py-4 md:py-6 text-sm md:text-base text-black"
            />
          </div>
        </div>

        {/* Swap button */}
        <Button
          variant="default"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-green-500 text-white rounded-full border border-green-600 z-10 w-10 h-10 flex items-center justify-center shadow-md hover:bg-green-600 md:w-12 md:h-12"
          onClick={swapLocations}
        >
          <ArrowRightLeft className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="relative">
          <div className="flex items-center mb-1">
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
            <label className="block text-xs md:text-sm text-black font-medium">
              {t("airportTransfer.departure", "Departure")}
            </label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
              >
                {departureDate ? (
                  format(departureDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={departureDate}
                onSelect={(date) => {
                  setDepartureDate(date);
                  document.body.click(); // Close the popover
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {isRoundTrip && (
          <div className="relative">
            <div className="flex items-center mb-1">
              <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
              <label className="block text-xs md:text-sm text-black font-medium">
                {t("airportTransfer.return", "Return")}
              </label>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
                >
                  {returnDate ? (
                    format(returnDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={returnDate}
                  onSelect={(date) => {
                    setReturnDate(date);
                    document.body.click(); // Close the popover
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Passengers and Class */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <div className="flex items-center mb-1">
            <User className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
            <label className="block text-xs md:text-sm text-black font-medium">
              {t("airportTransfer.passengers", "Passengers")}
            </label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
              >
                {passengers}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4">
              <div className="space-y-4">
                <h4 className="font-medium">Passengers</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Adults</span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setAdultCount(Math.max(1, adultCount - 1))
                        }
                        disabled={adultCount <= 1}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{adultCount}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setAdultCount(adultCount + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Children</span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setChildCount(Math.max(0, childCount - 1))
                        }
                        disabled={childCount <= 0}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{childCount}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setChildCount(childCount + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Infants</span>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          setInfantCount(Math.max(0, infantCount - 1))
                        }
                        disabled={infantCount <= 0}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{infantCount}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setInfantCount(infantCount + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const newPassengerText = `${adultCount} Adult${adultCount > 1 ? "s" : ""}, ${childCount} child${childCount > 1 ? "ren" : ""}, ${infantCount} infant${infantCount > 1 ? "s" : ""}`;
                    setPassengers(newPassengerText);
                    document.body.click(); // Close the popover
                  }}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="relative">
          <div className="flex items-center mb-1">
            <Badge className="h-4 w-4 md:h-5 md:w-5 bg-green-600 text-white p-0 flex items-center justify-center mr-2">
              <span className="text-[10px]">C</span>
            </Badge>
            <label className="block text-xs md:text-sm text-black font-medium">
              {t("airportTransfer.class", "Class")}
            </label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
              >
                <span>{travelClass}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4">
              <div className="space-y-4">
                <h4 className="font-medium">Select Class</h4>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setTravelClass("Economy");
                      document.body.click(); // Close the popover
                    }}
                  >
                    Economy
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setTravelClass("Premium Economy");
                      document.body.click(); // Close the popover
                    }}
                  >
                    Premium Economy
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setTravelClass("Business");
                      document.body.click(); // Close the popover
                    }}
                  >
                    Business
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setTravelClass("First Class");
                      document.body.click(); // Close the popover
                    }}
                  >
                    First Class
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Search Button */}
      <Button
        className="w-full bg-green-500 hover:bg-green-600 text-white py-4 md:py-6 text-base md:text-lg mt-2"
        onClick={handleSearch}
      >
        <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
        {t("airportTransfer.searchFlights", "Search Flights")}
      </Button>
    </div>
  );
};

// Hotel Search Form Component
const HotelSearchForm = ({ handleSearch, t }) => {
  const [departureDate, setDepartureDate] = useState<Date>(new Date());
  const [returnDate, setReturnDate] = useState<Date | undefined>(new Date());
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="flex items-center mb-1">
          <MapPin className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
          <label className="block text-xs md:text-sm text-black font-medium">
            Destination
          </label>
        </div>
        <Input
          placeholder="City, hotel, or specific location"
          className="py-4 md:py-6 text-sm md:text-base text-black"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="relative">
          <div className="flex items-center mb-1">
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
            <label className="block text-xs md:text-sm text-black font-medium">
              Check-in
            </label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
              >
                {departureDate ? (
                  format(departureDate, "PPP")
                ) : (
                  <span>Select date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={departureDate}
                onSelect={(date) => {
                  setDepartureDate(date);
                  document.body.click();
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="relative">
          <div className="flex items-center mb-1">
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
            <label className="block text-xs md:text-sm text-black font-medium">
              Check-out
            </label>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
              >
                {returnDate ? (
                  format(returnDate, "PPP")
                ) : (
                  <span>Select date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={returnDate}
                onSelect={(date) => {
                  setReturnDate(date);
                  document.body.click();
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center mb-1">
          <User className="h-4 w-4 md:h-5 md:w-5 text-green-600 mr-2" />
          <label className="block text-xs md:text-sm text-black font-medium">
            Guests and Rooms
          </label>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal py-4 md:py-6 text-sm md:text-base text-black"
            >
              {adultCount} Adults, {childCount} Children, 1 Room
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-4">
              <h4 className="font-medium">Guests</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Adults</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAdultCount(Math.max(1, adultCount - 1))}
                      disabled={adultCount <= 1}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{adultCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setAdultCount(adultCount + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Children</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setChildCount(Math.max(0, childCount - 1))}
                      disabled={childCount <= 0}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">{childCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setChildCount(childCount + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Rooms</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={true}
                    >
                      -
                    </Button>
                    <span className="w-8 text-center">1</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      disabled={true}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </div>
              <Button className="w-full" onClick={() => document.body.click()}>
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Button
        className="w-full bg-green-500 hover:bg-green-600 text-white py-4 md:py-6 text-base md:text-lg mt-2"
        onClick={handleSearch}
      >
        <Search className="mr-2 h-4 w-4 md:h-5 md:w-5" />
        Search Hotels
      </Button>
    </div>
  );
};

// Features Section Component
const FeaturesSection = ({ t }) => {
  return (
    <section className="py-12 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          {t("features.title", "Why Choose Us")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col items-center text-center p-4">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t("features.fast.title", "Fast Booking")}
            </h3>
            <p className="text-gray-600">
              {t(
                "features.fast.description",
                "Book your travel in minutes with our streamlined process.",
              )}
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t("features.secure.title", "Secure Payments")}
            </h3>
            <p className="text-gray-600">
              {t(
                "features.secure.description",
                "Your payment information is always protected with us.",
              )}
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <CreditCard className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t("features.best.title", "Best Prices")}
            </h3>
            <p className="text-gray-600">
              {t(
                "features.best.description",
                "We guarantee the best rates for your travel needs.",
              )}
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4">
            <div className="bg-green-100 p-4 rounded-full mb-4">
              <Headphones className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t("features.support.title", "24/7 Support")}
            </h3>
            <p className="text-gray-600">
              {t(
                "features.support.description",
                "Our customer support team is always available to help you.",
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Popular Destinations Section Component
const PopularDestinationsSection = ({ t }) => {
  const destinations = [
    {
      name: "Bali",
      image:
        "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
      description: "Island paradise with beautiful beaches and rich culture.",
    },
    {
      name: "Jakarta",
      image:
        "https://images.unsplash.com/photo-1555899434-94d1368aa7af?w=800&q=80",
      description: "Vibrant capital city with modern attractions.",
    },
    {
      name: "Yogyakarta",
      image:
        "https://images.unsplash.com/photo-1584810359583-96fc3448beaa?w=800&q=80",
      description: "Cultural heart of Java with ancient temples.",
    },
    {
      name: "Lombok",
      image:
        "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&q=80",
      description: "Serene beaches and stunning mountain landscapes.",
    },
  ];

  return (
    <section className="py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
          {t("destinations.title", "Popular Destinations")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {destinations.map((destination, index) => (
            <div
              key={index}
              className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300"
            >
              <div className="h-48 overflow-hidden">
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">
                  {destination.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {destination.description}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 w-full border-green-500 text-green-500 hover:bg-green-50"
                >
                  Explore
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Newsletter Section Component
const NewsletterSection = ({ t }) => {
  return (
    <section className="py-12 bg-green-800 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t("newsletter.title", "Subscribe to Our Newsletter")}
          </h2>
          <p className="mb-6">
            {t(
              "newsletter.description",
              "Get the latest travel deals and updates delivered straight to your inbox.",
            )}
          </p>
          <div className="flex flex-col md:flex-row gap-2 max-w-md mx-auto">
            <Input
              type="email"
              placeholder="Your email address"
              className="bg-white text-black"
            />
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              {t("newsletter.subscribe", "Subscribe")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

// Footer Component
const Footer = ({ t }) => {
  return (
    <footer className="bg-green-900 text-white pt-12 pb-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {t("footer.about.title", "About Us")}
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              {t(
                "footer.about.description",
                "Travelintrips is your trusted partner for all your travel needs, providing seamless booking experiences since 2020.",
              )}
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 cursor-pointer hover:text-green-300" />
              <Twitter className="h-5 w-5 cursor-pointer hover:text-green-300" />
              <Instagram className="h-5 w-5 cursor-pointer hover:text-green-300" />
              <Youtube className="h-5 w-5 cursor-pointer hover:text-green-300" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {t("footer.services.title", "Our Services")}
            </h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.services.flights", "Flight Booking")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.services.hotels", "Hotel Reservations")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.services.cars", "Car Rentals")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.services.airport", "Airport Transfers")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.services.activities", "Travel Activities")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {t("footer.support.title", "Support")}
            </h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.support.faq", "FAQ")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.support.contact", "Contact Us")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.support.terms", "Terms & Conditions")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.support.privacy", "Privacy Policy")}
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white">
                  {t("footer.support.cancellation", "Cancellation Policy")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">
              {t("footer.contact.title", "Contact Info")}
            </h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 mr-2 mt-0.5" />
                <span>
                  Head Quarter: Jln. Ternate No. 10
                  <br />
                  Jakarta, Indonesia 10150
                </span>
              </li>
              <li className="flex items-start">
                <span>
                  Office: Koperasi Angkasa Pura Pool Diva Trans, Pajang, Kec.
                  Benda
                  <br />
                  Tangerang Kota, Banten 15126
                </span>
              </li>
              <li className="flex items-start">
                <span>
                  Sport Center: Soekarno Hatta Jl. C3 No. 831 RT 001 RW 010
                  Belakang Masjid Nurul Barkah Pajang
                  <br />
                  Benda,Tangerang Kota, Banten 15126
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-2" />
                <span>+62 822 9999 7227</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                <span>info@travelintrips.com</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-green-800 pt-6 text-center text-gray-300 text-sm">
          <p>
            &copy; {new Date().getFullYear()}{" "}
            {t("footer.copyright", "Travelintrips. All rights reserved.")}
          </p>
        </div>
      </div>
    </footer>
  );
};

// Main TravelPage Component
const TravelPageContent = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, isHydrated } = useAuth();

  // Initialize all state hooks first to maintain consistent hook order
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [authFormType, setAuthFormType] = useState<"login" | "register">(
    "login",
  );
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || "en");
  const [currentCurrency, setCurrentCurrency] = useState({
    code: "IDR",
    symbol: "Rp",
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("flights");

  // Update currency when language changes - only after hydration
  useEffect(() => {
    if (!isHydrated) return; // 🎯 Wait for hydration

    const updateCurrency = () => {
      const currencyCode = t("currency.code", "IDR");
      const currencySymbol = t("currency.symbol", "Rp");
      setCurrentCurrency({ code: currencyCode, symbol: currencySymbol });
    };

    updateCurrency();
    setCurrentLanguage(i18n.language || "en");
  }, [t, isHydrated]);

  // Handle auth form visibility based on authentication state
  useEffect(() => {
    if (isAuthenticated) {
      setShowAuthForm(false);
    }
  }, [isAuthenticated]);

  // 🎯 BLOCKING GUARD: Prevent rendering until session is hydrated with timeout
  // This is placed AFTER all hooks to maintain consistent hook order
  const [loadingTimeout, setLoadingTimeout] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingTimeout(true);
    }, 1500); // Reduced timeout to minimize flickering

    return () => clearTimeout(timer);
  }, []);

  // Reduce loading screen time to minimize flickering
  if ((!isHydrated || isLoading) && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Loading...
          </h2>
        </div>
      </div>
    );
  }

  const handleAuthStateChange = (state: boolean) => {
    if (state) {
      // Always close the auth form when authentication state changes to true
      setShowAuthForm(false);
    }
  };

  const handleSearch = () => {
    // Remove authentication check - allow all users to search
    // In a real app, this would navigate to search results
    alert("Search functionality will be implemented in the future.");
  };

  const handleTravelOptionClick = (option: string) => {
    // Remove authentication checks - allow all users to access these pages
    // Handle navigation based on the selected travel option
    switch (option) {
      case "Hotels":
        navigate("/hotels");
        break;
      case "Flights":
        navigate("/flights");
        break;
      case "Trains":
        navigate("/trains");
        break;
      case "Bus & Travel":
        navigate("/bus-travel");
        break;
      case "Airport Transfer":
        navigate("/airport-transfer");
        break;
      case "Baggage":
        navigate("/baggage");
        break;
      case "Handling":
        navigate("/handling");
        break;
      case "Car Rental":
        navigate("/rentcar");
        break;
      case "Things to Do":
        navigate("/things-to-do");
        break;
      case "More":
        navigate("/more");
        break;
      default:
        navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <MobileMenu
          setMobileMenuOpen={setMobileMenuOpen}
          handleTravelOptionClick={handleTravelOptionClick}
          isAuthenticated={isAuthenticated}
          setShowAuthForm={setShowAuthForm}
          setAuthFormType={setAuthFormType}
          currentLanguage={currentLanguage}
          currentCurrency={currentCurrency}
          navigate={navigate}
        />
      )}

      {/* Header */}
      <Header
        isAuthenticated={isAuthenticated}
        showAuthForm={showAuthForm}
        setShowAuthForm={setShowAuthForm}
        setAuthFormType={setAuthFormType}
        currentLanguage={currentLanguage}
        currentCurrency={currentCurrency}
        setMobileMenuOpen={setMobileMenuOpen}
        navigate={navigate}
      />

      {/* Secondary Navigation - Hidden when using the hero with integrated tabs */}
      {/* <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleTravelOptionClick={handleTravelOptionClick}
      /> */}

      {/* Hero Image Slider Section */}
      <div className="relative overflow-hidden">
        {/* Hero Slider */}
        <div className="relative w-full h-[500px] md:h-[600px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://travelintrips.co.id/wp-content/uploads/2025/05/Airport.png')",
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
            <h1 className="text-3xl md:text-5xl font-bold text-center mb-4 drop-shadow-lg">
              {t("hero.title", "Premium Car Rental Service")}
            </h1>
            <p className="text-center text-white text-lg md:text-xl mb-8 max-w-3xl mx-auto drop-shadow-md">
              {t(
                "hero.description",
                "Experience the freedom of the road with our extensive fleet of vehicles. Book your perfect ride today and enjoy hassle-free travel.",
              )}
            </p>
            <div className="flex flex-wrap gap-4 justify-center mb-20 md:mb-0">
              <Button
                size="lg"
                className="bg-white/10 backdrop-blur-sm border border-white text-white hover:bg-white/20 hover:text-white px-8 py-6 text-lg"
                onClick={() => handleTravelOptionClick("Car Rental")}
              >
                {t("hero.bookNow", "Book Now")}
              </Button>
              <Button
                size="lg"
                className="bg-white/10 backdrop-blur-sm border border-white text-white hover:bg-white/20 hover:text-white px-8 py-6 text-lg"
                onClick={() => handleTravelOptionClick("Car Rental")}
              >
                {t("hero.browseCars", "Browse Cars")}
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Desktop version positioned at the bottom of hero */}
        <div className="hidden md:block absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm py-3">
          <div className="container mx-auto px-4">
            <Tabs
              defaultValue="flights"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="flex justify-center space-x-2 bg-transparent w-full">
                <TabsTrigger
                  value="hotels"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 text-white"
                  onClick={() => handleTravelOptionClick("Hotels")}
                >
                  <Hotel className="h-5 w-5 mr-2" />
                  <span>Hotels</span>
                </TabsTrigger>
                <TabsTrigger
                  value="flights"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 text-white"
                  onClick={() => handleTravelOptionClick("Flights")}
                >
                  <Plane className="h-5 w-5 mr-2" />
                  <span>Flights</span>
                </TabsTrigger>
                <TabsTrigger
                  value="trains"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 text-white"
                  onClick={() => handleTravelOptionClick("Trains")}
                >
                  <Train className="h-5 w-5 mr-2" />
                  <span>Trains</span>
                </TabsTrigger>
                <TabsTrigger
                  value="bus"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 text-white"
                  onClick={() => handleTravelOptionClick("Bus & Travel")}
                >
                  <Bus className="h-5 w-5 mr-2" />
                  <span>Bus</span>
                </TabsTrigger>
                <TabsTrigger
                  value="airport"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 text-white"
                  onClick={() => handleTravelOptionClick("Airport Transfer")}
                >
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>Airport</span>
                </TabsTrigger>
                <TabsTrigger
                  value="baggage"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 text-white"
                  onClick={() => handleTravelOptionClick("Baggage")}
                >
                  <Luggage className="h-5 w-5 mr-2" />
                  <span>Baggage</span>
                </TabsTrigger>
                <TabsTrigger
                  value="handling"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 text-white"
                  onClick={() => handleTravelOptionClick("Handling")}
                >
                  <HandHeart className="h-5 w-5 mr-2" />
                  <span>Handling</span>
                </TabsTrigger>
                <TabsTrigger
                  value="car"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 text-white"
                  onClick={() => handleTravelOptionClick("Car Rental")}
                >
                  <Car className="h-5 w-5 mr-2" />
                  <span>Car</span>
                </TabsTrigger>
                <TabsTrigger
                  value="activities"
                  className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-1 text-white"
                  onClick={() => handleTravelOptionClick("Things to Do")}
                >
                  <Compass className="h-5 w-5 mr-2" />
                  <span>Activities</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - Displayed below hero content on mobile only */}
      <div className="md:hidden w-full bg-white pt-4">
        <div className="grid grid-cols-4 gap-2 px-2 pb-4">
          <button
            onClick={() => {
              setActiveTab("hotels");
              handleTravelOptionClick("Hotels");
            }}
            className={`flex flex-col items-center justify-center p-2 ${activeTab === "hotels" ? "text-green-500" : "text-gray-700"}`}
          >
            <Hotel className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Hotels</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("flights");
              handleTravelOptionClick("Flights");
            }}
            className={`flex flex-col items-center justify-center p-2 ${activeTab === "flights" ? "bg-green-500 text-white rounded-md" : "text-gray-700"}`}
          >
            <Plane className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Flights</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("trains");
              handleTravelOptionClick("Trains");
            }}
            className={`flex flex-col items-center justify-center p-2 ${activeTab === "trains" ? "text-green-500" : "text-gray-700"}`}
          >
            <Train className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Trains</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("bus");
              handleTravelOptionClick("Bus & Travel");
            }}
            className={`flex flex-col items-center justify-center p-2 ${activeTab === "bus" ? "text-green-500" : "text-gray-700"}`}
          >
            <Bus className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Bus</span>
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 px-2 pb-4">
          <button
            onClick={() => {
              setActiveTab("airport");
              handleTravelOptionClick("Airport Transfer");
            }}
            className={`flex flex-col items-center justify-center p-2 ${activeTab === "airport" ? "text-green-500" : "text-gray-700"}`}
          >
            <MapPin className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Airport</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("baggage");
              handleTravelOptionClick("Baggage");
            }}
            className={`flex flex-col items-center justify-center p-2 ${
              activeTab === "baggage" ? "text-green-500" : "text-gray-700"
            }`}
          >
            <Luggage className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Baggage</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("handling");
              handleTravelOptionClick("Handling");
            }}
            className={`flex flex-col items-center justify-center p-2 ${
              activeTab === "handling" ? "text-green-500" : "text-gray-700"
            }`}
          >
            <HandHeart className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Handling</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("car");
              handleTravelOptionClick("Car Rental");
            }}
            className={`flex flex-col items-center justify-center p-2 ${activeTab === "car" ? "text-green-500" : "text-gray-700"}`}
          >
            <Car className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Car</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("activities");
              handleTravelOptionClick("Things to Do");
            }}
            className={`flex flex-col items-center justify-center p-2 ${activeTab === "activities" ? "text-green-500" : "text-gray-700"}`}
          >
            <Compass className="h-6 w-6 mb-1" />
            <span className="text-xs font-medium">Activities</span>
          </button>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-2">
            {t("hero.title", "Premium Car Rental Service")}
          </h2>
          <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
            {t(
              "hero.description",
              "Experience the freedom of the road with our extensive fleet of vehicles. Book your perfect ride today and enjoy hassle-free travel.",
            )}
          </p>
        </div>
      </div>

      {/* Features Section */}
      <FeaturesSection t={t} />

      {/* Popular Destinations Section */}
      <PopularDestinationsSection t={t} />

      {/* Newsletter Section */}
      <NewsletterSection t={t} />

      {/* Footer */}
      <Footer t={t} />

      {/* Auth Form */}
      {showAuthForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">
                {authFormType === "login"
                  ? t("navbar.signIn", "Log In")
                  : t("navbar.register", "Register")}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAuthForm(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4">
              <AuthForm
                initialTab={authFormType}
                onAuthStateChange={handleAuthStateChange}
                onClose={() => setShowAuthForm(false)}
              />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TravelPageContent;
