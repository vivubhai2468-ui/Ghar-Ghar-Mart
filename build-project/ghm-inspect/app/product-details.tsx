import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';

const PRODUCT = {
  id: 1,
  name: 'Organic Tomatoes (1 kg)',
  price: 45,
  originalPrice: 60,
  discount: 25,
  rating: 4.5,
  reviews: 128,
  shop: 'Fresh Mart',
  description:
    'Fresh, organic tomatoes sourced directly from local farms. Rich in lycopene and vitamins. Perfect for salads, cooking, and sauces.',
  images: ['🍅', '🍅', '🍅'],
  inStock: true,
  deliveryTime: '30-45 mins',
  features: ['Organic', 'Fresh', 'No Pesticides', 'Farm Fresh'],
};

const SIMILAR_PRODUCTS = [
  { id: 2, name: 'Cherry Tomatoes', price: 80, icon: '🍅' },
  { id: 3, name: 'Tomato Paste', price: 120, icon: '🥫' },
  { id: 4, name: 'Tomato Sauce', price: 95, icon: '🍝' },
];

export default function ProductDetailsScreen() {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const router = useRouter();
  const colors = useColors();

  const handleAddToCart = () => {
    Alert.alert('Success', `Added ${quantity} item(s) to cart`);
  };

  const handleBuyNow = () => {
    Alert.alert('Checkout', 'Proceeding to checkout...');
  };

  const handleAddToWishlist = () => {
    Alert.alert('Added to Wishlist', 'Product added to your wishlist');
  };

  return (
    <ScreenContainer
      className="bg-background"
      containerClassName="bg-background"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleAddToWishlist}>
            <Text style={styles.wishlistButton}>❤️</Text>
          </TouchableOpacity>
        </View>

        {/* Product Image */}
        <View
          style={[
            styles.imageContainer,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={styles.productImage}>
            {PRODUCT.images[selectedImage]}
          </Text>
          {PRODUCT.discount > 0 && (
            <View
              style={[
                styles.discountBadge,
                { backgroundColor: colors.error },
              ]}
            >
              <Text style={styles.discountText}>-{PRODUCT.discount}%</Text>
            </View>
          )}
        </View>

        {/* Image Thumbnails */}
        <FlatList
          data={PRODUCT.images}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              onPress={() => setSelectedImage(index)}
              style={[
                styles.thumbnail,
                {
                  backgroundColor: colors.surface,
                  borderColor:
                    selectedImage === index ? colors.primary : colors.border,
                  borderWidth: selectedImage === index ? 2 : 1,
                },
              ]}
            >
              <Text style={styles.thumbnailImage}>{item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailList}
        />

        {/* Product Info */}
        <View style={styles.infoSection}>
          <Text
            style={[
              styles.productName,
              { color: colors.foreground },
            ]}
          >
            {PRODUCT.name}
          </Text>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStars}>⭐ {PRODUCT.rating}</Text>
            <Text style={[styles.reviewCount, { color: colors.muted }]}>
              ({PRODUCT.reviews} reviews)
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: colors.primary }]}>
              ₹{PRODUCT.price}
            </Text>
            <Text style={[styles.originalPrice, { color: colors.muted }]}>
              ₹{PRODUCT.originalPrice}
            </Text>
          </View>

          {/* Shop Info */}
          <View style={styles.shopInfo}>
            <Text style={[styles.shopLabel, { color: colors.muted }]}>
              Sold by
            </Text>
            <Text style={[styles.shopName, { color: colors.foreground }]}>
              {PRODUCT.shop}
            </Text>
          </View>

          {/* Delivery Info */}
          <View
            style={[
              styles.deliveryInfo,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={styles.deliveryIcon}>🚚</Text>
            <View>
              <Text style={[styles.deliveryLabel, { color: colors.muted }]}>
                Delivery
              </Text>
              <Text
                style={[
                  styles.deliveryTime,
                  { color: colors.foreground },
                ]}
              >
                {PRODUCT.deliveryTime}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground },
            ]}
          >
            Description
          </Text>
          <Text
            style={[
              styles.description,
              { color: colors.muted },
            ]}
          >
            {PRODUCT.description}
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground },
            ]}
          >
            Features
          </Text>
          <View style={styles.featuresList}>
            {PRODUCT.features.map((feature, index) => (
              <View
                key={index}
                style={[
                  styles.featureTag,
                  { backgroundColor: colors.primary + '20' },
                ]}
              >
                <Text
                  style={[
                    styles.featureText,
                    { color: colors.primary },
                  ]}
                >
                  ✓ {feature}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Similar Products */}
        <View style={styles.similarSection}>
          <Text
            style={[
              styles.sectionTitle,
              { color: colors.foreground },
            ]}
          >
            Similar Products
          </Text>
          <FlatList
            data={SIMILAR_PRODUCTS}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.similarCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={styles.similarIcon}>{item.icon}</Text>
                <Text
                  style={[
                    styles.similarName,
                    { color: colors.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.similarPrice,
                    { color: colors.primary },
                  ]}
                >
                  ₹{item.price}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          />
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={[
          styles.actionBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        {/* Quantity Selector */}
        <View
          style={[
            styles.quantitySelector,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            onPress={() => quantity > 1 && setQuantity(quantity - 1)}
            style={styles.quantityButton}
          >
            <Text style={[styles.quantityButtonText, { color: colors.primary }]}>
              −
            </Text>
          </TouchableOpacity>
          <Text style={[styles.quantityValue, { color: colors.foreground }]}>
            {quantity}
          </Text>
          <TouchableOpacity
            onPress={() => setQuantity(quantity + 1)}
            style={styles.quantityButton}
          >
            <Text style={[styles.quantityButtonText, { color: colors.primary }]}>
              +
            </Text>
          </TouchableOpacity>
        </View>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            onPress={handleAddToCart}
            style={[
              styles.addToCartButton,
              { borderColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.addToCartText,
                { color: colors.primary },
              ]}
            >
              Add to Cart
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBuyNow}
            style={[
              styles.buyNowButton,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.buyNowText,
                { color: colors.background },
              ]}
            >
              Buy Now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  wishlistButton: {
    fontSize: 24,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  productImage: {
    fontSize: 120,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  thumbnailList: {
    marginBottom: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  thumbnailImage: {
    fontSize: 32,
  },
  infoSection: {
    marginBottom: 20,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ratingStars: {
    fontSize: 14,
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  shopInfo: {
    marginBottom: 12,
  },
  shopLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  shopName: {
    fontSize: 14,
    fontWeight: '600',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  deliveryIcon: {
    fontSize: 24,
  },
  deliveryLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  deliveryTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
  },
  similarSection: {
    marginBottom: 20,
  },
  similarCard: {
    width: 100,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  similarIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  similarName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  similarPrice: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  quantityButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 8,
    minWidth: 20,
    textAlign: 'center',
  },
  buttons: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  addToCartButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buyNowButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
