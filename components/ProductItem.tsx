import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image,
  Platform
} from 'react-native';
import { Product } from '@/types/api';
import colors from '@/constants/colors';
import { Package } from 'lucide-react-native';
import { scaleFontSize, scaleSpacing } from '@/utils/responsive';

interface ProductItemProps {
  product: Product;
  onPress: () => void;
  darkMode?: boolean;
}

export const ProductItem: React.FC<ProductItemProps> = ({ 
  product, 
  onPress,
  darkMode = false
}) => {
  const theme = darkMode ? colors.dark : colors.light;

  // Fix for web compatibility - remove responder props on web
  const webSafeProps = Platform.OS === 'web' 
    ? { onStartShouldSetResponder: undefined, onResponderGrant: undefined, 
        onResponderMove: undefined, onResponderRelease: undefined, onResponderTerminate: undefined } 
    : {};

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.card }]} 
      onPress={onPress}
      activeOpacity={0.7}
      {...webSafeProps}
    >
      <View style={styles.imageContainer}>
        {product.imageUrl ? (
          <Image 
            source={{ uri: product.imageUrl }} 
            style={styles.image} 
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.placeholderImage, { backgroundColor: theme.background }]}>
            <Package size={24} color={theme.placeholder} />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
          {product.name}
        </Text>
        
        {product.description && (
          <Text style={[styles.description, { color: theme.placeholder }]} numberOfLines={2}>
            {product.description}
          </Text>
        )}
        
        <View style={styles.footer}>
          <Text style={[styles.price, { color: theme.primary }]}>
            ₽{Math.floor(product.price).toLocaleString()}
          </Text>
          
          {product.sku && (
            <Text style={[styles.sku, { color: theme.placeholder }]}>
              SKU: {product.sku}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: scaleSpacing(12),
    overflow: 'hidden',
  },
  imageContainer: {
    width: 80,
    height: 80,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: scaleSpacing(12),
    justifyContent: 'space-between',
  },
  name: {
    fontSize: scaleFontSize(16),
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: scaleFontSize(14),
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: scaleFontSize(16),
    fontWeight: 'bold',
  },
  sku: {
    fontSize: scaleFontSize(12),
  },
});