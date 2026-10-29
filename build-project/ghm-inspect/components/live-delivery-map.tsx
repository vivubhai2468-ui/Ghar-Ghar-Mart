// TypeScript resolves this shared entry during static checking. Metro resolves
// `live-delivery-map.native.tsx` on native devices and `live-delivery-map.web.tsx`
// on web, so each platform retains its dedicated implementation at runtime.
export * from "./live-delivery-map.web";
