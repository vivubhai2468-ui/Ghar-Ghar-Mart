import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import { cn } from '@/lib/utils';

interface ProductImageProps {
  uri?: string | null;
  alt?: string;
  className?: string;
  containerClassName?: string;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

const DEFAULT_PRODUCT_IMAGE = 'https://via.placeholder.com/200x200?text=Product';

export function ProductImage({
  uri,
  alt = 'Product',
  className = 'w-full h-40',
  containerClassName = 'bg-surface rounded-lg overflow-hidden',
  resizeMode = 'cover',
  onLoadStart,
  onLoadEnd,
}: ProductImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageUri, setImageUri] = useState(uri || DEFAULT_PRODUCT_IMAGE);

  useEffect(() => {
    setImageUri(uri || DEFAULT_PRODUCT_IMAGE);
    setHasError(false);
    setIsLoading(true);
  }, [uri]);

  const handleLoadStart = () => {
    setIsLoading(true);
    onLoadStart?.();
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
    onLoadEnd?.();
  };

  const handleError = () => {
    console.warn(`Failed to load image: ${imageUri}`);
    setHasError(true);
    setIsLoading(false);
    setImageUri(DEFAULT_PRODUCT_IMAGE);
  };

  return (
    <View className={cn('relative', containerClassName)}>
      <Image
        source={{ uri: imageUri }}
        className={cn('bg-surface', className)}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        accessibilityLabel={alt}
      />

      {isLoading && !hasError && (
        <View className="absolute inset-0 flex items-center justify-center bg-surface/50">
          <ActivityIndicator size="small" color="#2E7D32" />
        </View>
      )}

      {hasError && (
        <View className="absolute inset-0 flex items-center justify-center bg-surface">
          <View className="text-center">
            <View className="text-3xl text-muted mb-2">📦</View>
            <View className="text-xs text-muted">Image unavailable</View>
          </View>
        </View>
      )}
    </View>
  );
}
