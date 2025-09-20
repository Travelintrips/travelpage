import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Car,
  MapPin,
  ArrowLeft,
  Plane,
  Clock,
  Shield,
  Star,
} from "lucide-react";
import Header from "@/components/Header";

const TransportasiPage = () => {
  const navigate = useNavigate();

  const transportOptions = [
    {
      id: "airport-transfer",
      title: "Airport Transfer",
      description: "Reliable airport pickup and drop-off services",
      icon: <MapPin className="h-12 w-12 text-green-600" />,
      features: [
        "Professional drivers",
        "24/7 availability",
        "Flight tracking",
        "Meet & greet service",
      ],
      route: "/airport-transfer",
      bgGradient: "from-blue-500 to-blue-600",
      
    },
    {
      id: "rent-car",
      title: "Rent Car",
      description: "Wide selection of vehicles for your travel needs",
      icon: <Car className="h-12 w-12 text-blue-600" />,
      features: [
        "Various car models",
        "Competitive prices",
        "Insurance included",
        "Flexible rental periods",
      ],
      route: "/rentcar",
      bgGradient: "from-green-500 to-green-600",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "reguler-bandung",
      title: "Regular Transport",
      description: "Comfortable and affordable",
      icon: <Car className="h-12 w-12 text-red-600" />,
      features: [
        "Various car models",
        "Competitive prices",
        "Comfortable seats",
        "Professional driver",
      ],
      route: "/",
      bgGradient: "from-amber-800 to-amber-600",
      buttonColor: "bg-amber-700 hover:bg-amber-800",
    },
  ];

  const handleOptionClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-800 to-green-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              className="text-white hover:bg-green-700 mr-4"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Home
            </Button>
          </div>
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Transportasi Services
            </h1>
            <p className="text-xl md:text-2xl text-green-100 max-w-3xl mx-auto">
              Choose from our premium transportation services for a comfortable
              and reliable travel experience
            </p>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {transportOptions.map((option) => (
              <Card
                key={option.id}
                className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 overflow-hidden"
              >
                <div
                  className={`h-2 bg-gradient-to-r ${option.bgGradient}`}
                ></div>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-green-50 rounded-full group-hover:bg-green-100 transition-colors">
                      {option.icon}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
                    {option.title}
                  </CardTitle>
                  <p className="text-gray-600 text-lg">{option.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-6">
                    {option.features.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button
  className={`w-full ${option.buttonColor || "bg-green-600 hover:bg-green-700"} text-white py-3 text-lg font-semibold transition-colors`}
  onClick={() => handleOptionClick(option.route)}
>
  Choose {option.title}
</Button>

                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Why Choose Our Transportation Services?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We provide reliable, safe, and comfortable transportation
              solutions for all your travel needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Clock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">24/7 Availability</h3>
              <p className="text-gray-600">
                Our services are available round the clock to meet your
                transportation needs
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Safe & Secure</h3>
              <p className="text-gray-600">
                All our vehicles are regularly maintained and our drivers are
                professionally trained
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Star className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Premium Quality</h3>
              <p className="text-gray-600">
                Experience premium quality service with competitive pricing and
                excellent customer support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Book Your Transportation?
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Choose from our reliable transportation services and enjoy a
            comfortable journey
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
              onClick={() => navigate("/airport-transfer")}
            >
              Book Airport Transfer
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white text-green-600 hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
              onClick={() => navigate("/rentcar")}
            >
              Rent a Car
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportasiPage;
