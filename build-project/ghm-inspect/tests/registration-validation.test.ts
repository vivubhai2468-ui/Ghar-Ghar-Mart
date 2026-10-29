import { describe, expect, it } from "vitest";

import { getRegistrationFieldErrors } from "../lib/registration-validation";

describe("registration field validation", () => {
  it("allows a complete direct customer registration", () => {
    expect(getRegistrationFieldErrors({
      name: "Vivekanand Kumar",
      phone: "9631143837",
      address: "House 18, Main Road, Patna",
      password: "securepass1",
      role: "customer",
      aadhaarNumber: "",
    })).toEqual({});
  });

  it("returns field-specific messages instead of a generic validation failure", () => {
    expect(getRegistrationFieldErrors({
      name: "V",
      phone: "9631",
      address: "",
      password: "short",
      role: "customer",
      aadhaarNumber: "",
    })).toMatchObject({
      name: expect.stringContaining("full name"),
      phone: expect.stringContaining("10-digit"),
      address: expect.stringContaining("house"),
      password: expect.stringContaining("8 characters"),
    });
  });

  it("requires a password and Aadhaar when registering as a seller", () => {
    expect(getRegistrationFieldErrors({
      name: "Seller Kumar",
      phone: "9631143837",
      email: "seller@example.com",
      address: "House 18, Main Road, Patna",
      password: "",
      role: "seller",
      aadhaarNumber: "123",
    })).toMatchObject({
      password: expect.stringContaining("8 characters"),
      aadhaarNumber: expect.stringContaining("12-digit"),
    });
  });

  it("requires a password for delivery-partner registration", () => {
    expect(getRegistrationFieldErrors({
      name: "Delivery Kumar",
      phone: "9631143837",
      email: "delivery@example.com",
      address: "Delivery partner profile",
      password: "",
      role: "delivery_partner",
      aadhaarNumber: "123456789012",
    }).password).toContain("8 characters");
  });

  it("requires a valid recovery email for partner registration", () => {
    expect(getRegistrationFieldErrors({
      name: "Seller Kumar",
      phone: "9631143837",
      email: "not-an-email",
      address: "House 18, Main Road, Patna",
      password: "securepass1",
      role: "seller",
      aadhaarNumber: "123456789012",
    }).email).toContain("valid email address");
  });
});
