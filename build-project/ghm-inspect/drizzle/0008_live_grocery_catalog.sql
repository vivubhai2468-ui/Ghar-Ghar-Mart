-- Curated starter catalog for the shopper Home and Categories screens.
-- This seed is idempotent and uses a dedicated approved system seller.

INSERT INTO `users` (`openId`, `name`, `phone`, `loginMethod`, `role`, `isActive`, `shopName`, `shopDescription`, `shopStatus`)
SELECT 'catalog:ghar-ghar-fresh', 'Ghar Ghar Fresh', '+910000000000', 'system_catalog', 'seller', 1, 'Ghar Ghar Fresh', 'Curated daily grocery essentials for Ghar Ghar Mart shoppers.', 'approved'
WHERE NOT EXISTS (SELECT 1 FROM `users` WHERE `openId` = 'catalog:ghar-ghar-fresh');

INSERT INTO `categories` (`name`, `description`, `icon`, `isActive`)
SELECT 'Fruits', 'Fresh seasonal fruits', '🍎', 1 WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Fruits');
INSERT INTO `categories` (`name`, `description`, `icon`, `isActive`)
SELECT 'Vegetables', 'Farm fresh vegetables', '🥕', 1 WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Vegetables');
INSERT INTO `categories` (`name`, `description`, `icon`, `isActive`)
SELECT 'Dairy', 'Milk, yogurt and cheese', '🥛', 1 WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Dairy');
INSERT INTO `categories` (`name`, `description`, `icon`, `isActive`)
SELECT 'Bakery', 'Fresh breads and baked goods', '🍞', 1 WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Bakery');
INSERT INTO `categories` (`name`, `description`, `icon`, `isActive`)
SELECT 'Groceries', 'Rice, flour and cooking essentials', '🛍️', 1 WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Groceries');
INSERT INTO `categories` (`name`, `description`, `icon`, `isActive`)
SELECT 'Beverages', 'Juices, tea and coffee', '☕', 1 WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Beverages');
INSERT INTO `categories` (`name`, `description`, `icon`, `isActive`)
SELECT 'Snacks', 'Nuts and everyday snacks', '🍿', 1 WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Snacks');
INSERT INTO `categories` (`name`, `description`, `icon`, `isActive`)
SELECT 'Household', 'Home care essentials', '🧹', 1 WHERE NOT EXISTS (SELECT 1 FROM `categories` WHERE `name` = 'Household');

INSERT INTO `products` (`sellerId`, `categoryId`, `name`, `description`, `price`, `originalPrice`, `discount`, `stock`, `images`, `rating`, `reviewCount`, `isActive`, `isFeatured`, `approvalStatus`)
SELECT s.id, c.id, v.name, v.description, v.price, v.originalPrice, v.discount, v.stock, JSON_ARRAY(v.image), v.rating, v.reviewCount, 1, v.isFeatured, 'approved'
FROM `users` s
CROSS JOIN (
  SELECT 'Fruits' AS categoryName, 'Fresh Bananas · 1 dozen' AS name, 'Naturally ripened bananas, packed for everyday snacking.' AS description, 60.00 AS price, 75.00 AS originalPrice, 20 AS discount, 78 AS stock, 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&h=800&fit=crop' AS image, 4.7 AS rating, 456 AS reviewCount, 1 AS isFeatured
  UNION ALL SELECT 'Fruits', 'Crisp Red Apples · 1 kg', 'Sweet, crunchy red apples selected for freshness.', 120.00, 150.00, 20, 56, 'https://images.unsplash.com/photo-1560806674-104fc7c7d71d?w=800&h=800&fit=crop', 4.6, 312, 1
  UNION ALL SELECT 'Vegetables', 'Farm Fresh Tomatoes · 1 kg', 'Juicy kitchen tomatoes for curries, salads and sauces.', 45.00, 60.00, 25, 45, 'https://images.unsplash.com/photo-1592841494900-055cc137145b?w=800&h=800&fit=crop', 4.5, 234, 1
  UNION ALL SELECT 'Vegetables', 'Crunchy Carrots · 1 kg', 'Washed orange carrots with a natural crunch.', 35.00, 50.00, 30, 92, 'https://images.unsplash.com/photo-1584622614875-2f3dd3f057f1?w=800&h=800&fit=crop', 4.4, 189, 0
  UNION ALL SELECT 'Vegetables', 'Yellow Onions · 1 kg', 'Daily-use onions with reliable kitchen freshness.', 30.00, 45.00, 33, 120, 'https://images.unsplash.com/photo-1587049352861-d92d19620ca8?w=800&h=800&fit=crop', 4.2, 267, 0
  UNION ALL SELECT 'Vegetables', 'Spinach Leaves · 500 g', 'Fresh leafy spinach, ideal for quick healthy meals.', 25.00, 35.00, 29, 34, 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&h=800&fit=crop', 4.3, 145, 0
  UNION ALL SELECT 'Dairy', 'Farm Fresh Whole Milk · 1 L', 'Pasteurized whole milk for tea, coffee and everyday use.', 60.00, 75.00, 20, 67, 'https://images.unsplash.com/photo-1550583724-b2692b25a968?w=800&h=800&fit=crop', 4.6, 523, 1
  UNION ALL SELECT 'Dairy', 'Greek Yogurt · 500 g', 'Creamy high-protein yogurt for breakfast and bowls.', 85.00, 110.00, 23, 45, 'https://images.unsplash.com/photo-1488477181946-6428a0291840?w=800&h=800&fit=crop', 4.7, 401, 0
  UNION ALL SELECT 'Bakery', 'Whole Wheat Bread · 1 loaf', 'Freshly baked whole wheat bread for daily breakfasts.', 55.00, 70.00, 21, 52, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=800&fit=crop', 4.4, 345, 0
  UNION ALL SELECT 'Groceries', 'Premium Basmati Rice · 2 kg', 'Long-grain aromatic basmati rice for family meals.', 180.00, 240.00, 25, 89, 'https://images.unsplash.com/photo-1586208958839-06c17cacdf08?w=800&h=800&fit=crop', 4.7, 612, 1
  UNION ALL SELECT 'Groceries', 'Whole Wheat Atta · 5 kg', 'Stone-ground whole wheat flour for soft rotis.', 285.00, 330.00, 14, 54, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&h=800&fit=crop', 4.6, 382, 0
  UNION ALL SELECT 'Groceries', 'Cold Pressed Cooking Oil · 1 L', 'Versatile cooking oil for everyday Indian recipes.', 175.00, 210.00, 17, 41, 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&h=800&fit=crop', 4.5, 276, 0
  UNION ALL SELECT 'Beverages', 'Orange Juice · 1 L', 'Refreshing orange juice with bright citrus flavour.', 85.00, 110.00, 23, 54, 'https://images.unsplash.com/photo-1600271886742-f049cd1f1033?w=800&h=800&fit=crop', 4.4, 389, 0
  UNION ALL SELECT 'Beverages', 'Green Tea · 25 bags', 'Light, aromatic green tea for a mindful break.', 120.00, 160.00, 25, 67, 'https://images.unsplash.com/photo-1597318972826-c1e79f4a1c3f?w=800&h=800&fit=crop', 4.6, 421, 0
  UNION ALL SELECT 'Snacks', 'Premium Almonds · 250 g', 'Crunchy almonds for snacking and baking.', 220.00, 300.00, 27, 38, 'https://images.unsplash.com/photo-1508747703725-719777637510?w=800&h=800&fit=crop', 4.8, 634, 1
  UNION ALL SELECT 'Snacks', 'Classic Potato Chips · 150 g', 'Crisp salted potato chips for a quick snack.', 40.00, 55.00, 27, 92, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&h=800&fit=crop', 4.3, 278, 0
  UNION ALL SELECT 'Household', 'Lemon Dishwash Liquid · 500 ml', 'Concentrated dishwashing liquid for clean utensils.', 35.00, 50.00, 30, 78, 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&h=800&fit=crop', 4.4, 267, 0
  UNION ALL SELECT 'Household', 'Laundry Detergent · 1 kg', 'Powerful everyday laundry detergent powder.', 150.00, 200.00, 25, 64, 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&h=800&fit=crop', 4.6, 423, 0
) v
JOIN `categories` c ON c.name = v.categoryName
WHERE s.openId = 'catalog:ghar-ghar-fresh'
  AND NOT EXISTS (SELECT 1 FROM `products` existing WHERE existing.sellerId = s.id AND existing.name = v.name);
