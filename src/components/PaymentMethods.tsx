import React from "react";

const payments = [
  { src: "/payments/visa.svg", alt: "Visa" },
  { src: "/payments/paypal.svg", alt: "PayPal" },
  { src: "/payments/mastercard.svg", alt: "Mastercard" },
  { src: "/payments/maestro.svg", alt: "Maestro" },
  { src: "/payments/applepay.svg", alt: "Apple Pay" },
  { src: "/payments/gpay.svg", alt: "Google Pay" },
  { src: "/payments/alipay.svg", alt: "Alipay" },
  { src: "/payments/ideal.svg", alt: "iDeal" },
  { src: "/payments/discover.svg", alt: "Discover" },
  { src: "/payments/diners.svg", alt: "Diners Club" },
  { src: "/payments/amex.svg", alt: "American Express" },
  { src: "/payments/unionpay.svg", alt: "Union Pay" },
];

export default function PaymentMethods() {
  return (
    <div className="bg-gray-100 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 place-items-center">
          {payments.map((payment, index) => (
            <img
              key={index}
              src={payment.src}
              alt={payment.alt}
              className="h-8 object-contain"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
