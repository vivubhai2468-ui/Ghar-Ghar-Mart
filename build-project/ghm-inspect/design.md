# Ghar Ghar Mart - Mobile App Design Plan

## Brand Identity

- **App Name**: Ghar Ghar Mart
- **Tagline**: "From Every Shop to Every Home"
- **Primary Color**: Green (#2E7D32) - Represents freshness and trust
- **Secondary Color**: Yellow (#FFC107) - Represents fast delivery
- **Background**: White with subtle shadows
- **Style**: Modern, minimal, smooth animations, rounded corners, premium UI

## Screen List

### Authentication & Onboarding
1. **Splash Screen** - Animated intro with logo, app name, and slogan
2. **Onboarding Screen 1** - "Shop from nearby stores"
3. **Onboarding Screen 2** - "Fast and secure delivery"
4. **Onboarding Screen 3** - "Easy ordering with live tracking"
5. **Login Screen** - Mobile number and password sign-in
6. **Guest Mode** - Quick access without login
7. **Partner Password Setup** - Verify mobile by OTP when setting or resetting a partner password

### Consumer App - Main Navigation (5 Tabs)
1. **Home Screen** - Discovery and browsing
2. **Categories Screen** - Product categories
3. **Orders Screen** - Order history and tracking
4. **Wishlist Screen** - Saved products
5. **Profile Screen** - User account and settings

### Consumer App - Detailed Screens
6. **Shop Details** - View nearby shop information
7. **Product Details** - Product images, description, price, quantity selector
8. **Cart Screen** - Review items, apply coupons, proceed to checkout
9. **Checkout Screen** - Address selection, payment method, order confirmation
10. **Order Tracking** - Real-time delivery status with map
11. **Saved Addresses** - Manage delivery addresses
12. **Wallet Screen** - View balance, transaction history
13. **Notifications Screen** - Order updates, promotions, offers
14. **Search Results** - Product search with filters
15. **Ratings & Reviews** - View and submit reviews

### Seller Panel (Role-based, separate app flow)
1. **Seller Login** - Mobile number and password; OTP is used for password setup or recovery
2. **Seller Dashboard** - Overview of orders, sales, earnings
3. **Products Management** - Add/Edit/Delete products with images and videos
4. **Inventory Management** - Stock levels and availability
5. **Orders Management** - View, confirm, pack, and mark as out for delivery
6. **Sales Reports** - Daily/monthly sales analytics
7. **Earnings Screen** - Revenue tracking and payouts
8. **Customer Reviews** - View ratings and feedback
9. **Notifications** - New orders, customer messages
10. **Seller Profile** - Account and shop settings

### Admin Panel (Web-based, accessible from mobile)
1. **Admin Dashboard** - Overview of users, sellers, orders, revenue
2. **Users Management** - View, manage, deactivate users
3. **Sellers Management** - Approve/reject seller registrations, manage seller accounts
4. **Products Management** - Manage all products across sellers
5. **Categories Management** - Create and manage product categories
6. **Orders Management** - View all orders, manage statuses
7. **Delivery Partners** - Manage delivery personnel
8. **Coupons & Offers** - Create and manage promotional codes
9. **Wallet Management** - View user wallets and transactions
10. **Notifications** - Send push notifications to users
11. **Advertisements & Banners** - Manage promotional banners
12. **Payments** - View payment transactions and settlements
13. **Analytics & Reports** - Revenue, daily orders, monthly sales, active customers
14. **App Settings** - Configure WhatsApp Business link, logo, splash screen, slogan
15. **Policies** - Manage privacy policy and terms & conditions

## Primary Content and Functionality

### Home Screen (Consumer)
- **Search Bar** - Search products by name
- **Delivery Location** - Display current delivery address with change option
- **Promotional Banner Slider** - Auto-rotating carousel of offers
- **Categories** - Horizontal scroll of product categories
- **Nearby Shops** - Grid/list of nearby delivery partners
- **Featured Products** - Curated product selection
- **Best Sellers** - Top-selling products
- **Offers** - Active promotional offers
- **Recommended Products** - Personalized recommendations
- **Floating WhatsApp Button** - Quick access to customer support (bottom-right)

### Product Details Screen
- **Product Images** - Image gallery with zoom capability
- **Product Name & Description** - Full product details
- **Price & Discount** - Original price, discounted price, discount percentage
- **Quantity Selector** - Increment/decrement quantity
- **Add to Cart Button** - Add product to shopping cart
- **Buy Now Button** - Quick checkout option
- **Similar Products** - Related product recommendations
- **Ratings & Reviews** - Customer ratings and reviews section

### Cart & Checkout
- **Cart Items** - List of selected products with quantity and price
- **Coupon Code Input** - Apply discount codes
- **Order Summary** - Subtotal, taxes, delivery charges, total
- **Payment Methods** - Online payment and Cash on Delivery options
- **Address Selection** - Choose or add delivery address
- **Order Confirmation** - Order placed confirmation with order ID

### Order Tracking
- **Order Status Timeline** - Order Placed → Confirmed → Packed → Out for Delivery → Delivered
- **Live Map** - Real-time delivery location (if available)
- **Estimated Delivery Time** - ETA display
- **Delivery Partner Info** - Name, contact, vehicle info
- **Customer Support** - Contact support option

## Key User Flows

### Consumer - Browse and Purchase
1. User opens app → Splash screen → Onboarding (if first time)
2. User logs in or continues as guest
3. Home screen displays with nearby shops and products
4. User searches or browses categories
5. User taps product → Product details screen
6. User selects quantity → Add to cart
7. User taps cart icon → Cart screen
8. User applies coupon (optional) → Checkout
9. User selects payment method and address → Confirm order
10. Order confirmation screen with tracking option
11. User can track order in real-time

### Seller - Manage Products and Orders
1. Seller logs in with mobile number and password
2. Seller dashboard shows pending orders and sales
3. Seller taps "New Order" notification
4. Seller confirms order → Updates inventory
5. Seller marks as "Packed" → System notifies customer
6. Seller views sales reports and earnings
7. Seller can add new products with images/videos

### Admin - Manage Platform
1. Admin logs in
2. Admin dashboard shows key metrics (revenue, orders, customers)
3. Admin can approve new sellers
4. Admin can manage products, categories, coupons
5. Admin can view detailed analytics and reports
6. Admin can configure app settings (WhatsApp link, logo, etc.)

## Color Choices

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Primary Button | Green | #2E7D32 | CTAs, confirmations |
| Secondary Accent | Yellow | #FFC107 | Highlights, badges |
| Background | White | #FFFFFF | Main background |
| Text Primary | Dark Gray | #212121 | Main text |
| Text Secondary | Medium Gray | #757575 | Secondary text |
| Border | Light Gray | #E0E0E0 | Dividers, borders |
| Success | Green | #4CAF50 | Success states |
| Warning | Orange | #FF9800 | Warning states |
| Error | Red | #F44336 | Error states |
| Disabled | Light Gray | #BDBDBD | Disabled elements |

## Design Principles

1. **Mobile-First**: Design assumes portrait orientation (9:16) and one-handed usage
2. **Apple HIG Compliance**: Follow iOS Human Interface Guidelines for native feel
3. **Accessibility**: Sufficient color contrast, readable text sizes, touch targets ≥ 44pt
4. **Performance**: Lazy load images, optimize animations, smooth scrolling
5. **Feedback**: Clear loading states, success/error messages, haptic feedback
6. **Consistency**: Unified component library, consistent spacing and typography
