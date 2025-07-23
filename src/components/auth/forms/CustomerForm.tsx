import React from "react";
import { Control } from "react-hook-form";
import { RegisterFormValues } from "../RegistrationForm";

interface CustomerFormProps {
  control: Control<RegisterFormValues>;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ control }) => {
  // Customer registration doesn't require additional fields beyond the base form
  return null;
};

export default CustomerForm;
