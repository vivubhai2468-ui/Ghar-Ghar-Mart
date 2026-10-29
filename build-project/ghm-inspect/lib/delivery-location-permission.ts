export function shouldRequestForegroundLocationAfterLogin(role: string | null | undefined, deliveryPartnerStatus?: string | null) {
  return role === "delivery_partner" && deliveryPartnerStatus === "approved";
}

export function getDeliveryGpsUnavailableMessage() {
  return "GPS permission was not granted at sign-in. Enable location access in device settings, then reopen the Delivery Partner workspace.";
}
