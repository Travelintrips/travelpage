import React from "react";
import { useParams } from "react-router-dom";
import PaymentDetailsPage from "./PaymentDetailsPage";

const PaymentPage = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <div>Payment ID is required</div>;
  }

  return <PaymentDetailsPage id={id} />;
};

export default PaymentPage;
