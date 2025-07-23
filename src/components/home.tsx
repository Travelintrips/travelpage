import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Car,
  Calendar,
  CreditCard,
  User,
  Plane,
  Globe,
  Moon,
  Sun,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const Home = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Set document title based on language
  useEffect(() => {
    document.title = t("brand", "Premium Car Rental Service");
  }, [t, i18n.language]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div
      className={`min-h-screen bg-background ${theme === "dark" ? "dark" : ""}`}
    >
      {/* Navbar */}
      <nav className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur-sm border-b border-border/60 py-4 px-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="bg-primary/10 p-1.5 rounded-full">
              <Car className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
              {t("brand", "CarRental")}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Globe className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <div className="grid gap-1">
                  <h4 className="font-medium mb-1">{t("language.select")}</h4>
                  <Button
                    variant={i18n.language === "en" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("en")}
                  >
                    {t("language.en")}
                  </Button>
                  <Button
                    variant={i18n.language === "id" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("id")}
                  >
                    {t("language.id")}
                  </Button>
                  <Button
                    variant={i18n.language === "zh" ? "default" : "ghost"}
                    size="sm"
                    className="justify-start"
                    onClick={() => i18n.changeLanguage("zh")}
                  >
                    {t("language.zh")}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            <Button variant="default" onClick={() => navigate("/rentcar")}>
              {t("navbar.signIn")}
            </Button>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted to-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
              {t("hero.title")}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              {t("hero.description")}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                size="lg"
                className="flex items-center gap-2 shadow-md hover:shadow-lg transition-all hover:bg-primary-dark cursor-pointer active:scale-95"
                onClick={() => navigate("/rentcar")}
              >
                <Car className="h-5 w-5" />
                {t("hero.browseCars")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:bg-secondary/50 hover:text-primary"
                onClick={() => navigate("/rentcar")}
              >
                <Calendar className="h-5 w-5" />
                {t("hero.bookNow")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all hover:bg-secondary/50 hover:text-primary"
                onClick={() => navigate("/airport-transfer")}
              >
                <Plane className="h-5 w-5" />
                {t("hero.airportTransfer", "Airport Transfer")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 relative">
            <span className="relative z-10">{t("whyChoose.title")}</span>
            <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-primary rounded-full"></span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <Card className="border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
              <CardContent className="pt-8 p-6">
                <div className="text-center">
                  <div className="bg-primary/10 p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md">
                    <Car className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4">
                    {t("whyChoose.premiumVehicles")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("whyChoose.premiumVehiclesDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
              <CardContent className="pt-8 p-6">
                <div className="text-center">
                  <div className="bg-primary/10 p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md">
                    <Calendar className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4">
                    {t("whyChoose.flexibleBooking")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("whyChoose.flexibleBookingDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border/40 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
              <CardContent className="pt-8 p-6">
                <div className="text-center">
                  <div className="bg-primary/10 p-5 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-md">
                    <CreditCard className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4">
                    {t("whyChoose.securePayments")}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {t("whyChoose.securePaymentsDesc")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="bg-primary/10 p-2 rounded-full">
                <Car className="h-7 w-7 text-primary" />
              </div>
              <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-dark">
                {t("brand", "CarRental")}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {t("brand", "Car Rental Service")}.{" "}
              {t("footer.allRightsReserved")}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
