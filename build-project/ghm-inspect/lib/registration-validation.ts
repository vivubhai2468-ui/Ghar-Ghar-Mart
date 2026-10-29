export type RegistrationField = "name" | "phone" | "email" | "address" | "password" | "aadhaarNumber";

export type RegistrationDetails = {
  name: string;
  phone: string;
  email?: string;
  address: string;
  password: string;
  role: "customer" | "seller" | "delivery_partner";
  aadhaarNumber: string;
};

export function getRegistrationFieldErrors(details: RegistrationDetails): Partial<Record<RegistrationField, string>> {
  const errors: Partial<Record<RegistrationField, string>> = {};
  if (details.name.trim().length < 2) errors.name = "Enter your full name (at least 2 characters).";
  if (details.phone.replace(/\D/g, "").length !== 10) errors.phone = "Enter a valid 10-digit mobile number.";
  if (details.role !== "customer" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email?.trim() ?? "")) {
    errors.email = "Enter a valid email address so you can receive password reset links.";
  }
  if (details.address.trim().length < 5) errors.address = "Enter your house, street, locality, or city.";
  if (details.password.length < 8) errors.password = "Create a password with at least 8 characters.";
  if (details.role === "seller" && details.aadhaarNumber.replace(/\D/g, "").length !== 12) errors.aadhaarNumber = "Enter a valid 12-digit Aadhaar number.";
  return errors;
}
