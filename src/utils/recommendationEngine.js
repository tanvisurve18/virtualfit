/**
 * Recommendation Engine
 * Provides intelligent product recommendations based on user behavior
 */

import { hmMenTshirts } from "../data/hmMenTshirts";
import { hmWomenTshirts } from "../data/hmWomenTshirts";

// Combine all products
const ALL_PRODUCTS = [
  ...hmMenTshirts.map(p => ({ ...p, category: "men", gender: "men" })),
  ...hmWomenTshirts.map(p => ({ ...p, category: "women", gender: "women" }))
];

/**
 * Extract color from product title/name
 */
function extractColor(title) {
  const colors = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'pink', 'purple', 
                  'gray', 'grey', 'brown', 'orange', 'navy', 'beige', 'cream'];
  const titleLower = title.toLowerCase();
  return colors.find(color => titleLower.includes(color)) || 'unknown';
}

/**
 * Extract style/type from product title
 */
function extractStyle(title) {
  const styles = {
    casual: ['casual', 'basic', 'everyday', 'relaxed', 'comfort'],
    formal: ['formal', 'dress', 'business', 'office', 'professional'],
    party: ['party', 'evening', 'cocktail', 'festive', 'sequin', 'glitter'],
    sport: ['sport', 'active', 'gym', 'athletic', 'workout'],
    vintage: ['vintage', 'retro', 'classic'],
    trendy: ['trendy', 'fashion', 'modern', 'stylish']
  };
  
  const titleLower = title.toLowerCase();
  for (const [style, keywords] of Object.entries(styles)) {
    if (keywords.some(keyword => titleLower.includes(keyword))) {
      return style;
    }
  }
  return 'casual'; // default
}

/**
 * Parse price string to number
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const match = priceStr.match(/[\d,]+/);
  return match ? parseFloat(match[0].replace(',', '')) : 0;
}

/**
 * Calculate similarity score between two products
 */
function calculateSimilarity(product1, product2) {
  let score = 0;
  
  // Same category/gender: +3
  if (product1.gender === product2.gender) score += 3;
  
  // Same color: +2
  const color1 = extractColor(product1.title);
  const color2 = extractColor(product2.title);
  if (color1 === color2 && color1 !== 'unknown') score += 2;
  
  // Same style: +2
  const style1 = extractStyle(product1.title);
  const style2 = extractStyle(product2.title);
  if (style1 === style2) score += 2;
  
  // Similar price range (within 20%): +1
  const price1 = parsePrice(product1.price);
  const price2 = parsePrice(product2.price);
  if (price1 && price2) {
    const priceDiff = Math.abs(price1 - price2) / Math.max(price1, price2);
    if (priceDiff < 0.2) score += 1;
  }
  
  return score;
}

/**
 * Get recommendations based on similar products
 */
export function getSimilarProducts(product, count = 4) {
  if (!product) return [];
  
  const scored = ALL_PRODUCTS
    .filter(p => p.id !== product.id)
    .map(p => ({
      ...p,
      similarity: calculateSimilarity(product, p)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, count);
  
  return scored.map(({ similarity, ...product }) => ({
    ...product,
    recommendationType: 'similar',
    badge: 'Similar Item'
  }));
}

/**
 * Get recommendations based on user's try-on history
 */
export function getHistoryBasedRecommendations(historyItems, count = 6) {
  if (!historyItems || historyItems.length === 0) {
    return getRandomRecommendations(count);
  }
  
  // Analyze user's history
  const genderCounts = { men: 0, women: 0 };
  const colorCounts = {};
  const styleCounts = {};
  const priceSum = { total: 0, count: 0 };
  
  historyItems.forEach(item => {
    // Determine gender from product_id or name
    const isMen = hmMenTshirts.some(p => String(p.id) === String(item.product_id));
    const gender = isMen ? 'men' : 'women';
    genderCounts[gender]++;
    
    // Count colors
    const color = extractColor(item.product_name || '');
    colorCounts[color] = (colorCounts[color] || 0) + 1;
    
    // Count styles
    const style = extractStyle(item.product_name || '');
    styleCounts[style] = (styleCounts[style] || 0) + 1;
    
    // Average price
    const price = parsePrice(item.product_price);
    if (price) {
      priceSum.total += price;
      priceSum.count++;
    }
  });
  
  // Determine preferred gender
  const preferredGender = genderCounts.men >= genderCounts.women ? 'men' : 'women';
  
  // Determine preferred color
  const preferredColor = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
  
  // Determine preferred style
  const preferredStyle = Object.entries(styleCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'casual';
  
  // Average price
  const avgPrice = priceSum.count > 0 ? priceSum.total / priceSum.count : 0;
  
  // Score products based on preferences
  const scored = ALL_PRODUCTS.map(p => {
    let score = 0;
    
    // Preferred gender
    if (p.gender === preferredGender) score += 5;
    
    // Preferred color
    if (extractColor(p.title) === preferredColor && preferredColor !== 'unknown') {
      score += 3;
    }
    
    // Preferred style
    if (extractStyle(p.title) === preferredStyle) score += 3;
    
    // Similar price range
    if (avgPrice > 0) {
      const price = parsePrice(p.price);
      const priceDiff = Math.abs(price - avgPrice) / avgPrice;
      if (priceDiff < 0.3) score += 2;
    }
    
    // Random factor for variety
    score += Math.random() * 2;
    
    return { ...p, score };
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, count);
  
  return scored.map(({ score, ...product }) => ({
    ...product,
    recommendationType: 'based-on-history',
    badge: 'Based on Your Try-Ons'
  }));
}

/**
 * Get recommendations based on user's saved/favorite items
 */
export function getFavoritesBasedRecommendations(favorites, count = 6) {
  if (!favorites || favorites.length === 0) {
    return getRandomRecommendations(count);
  }
  
  // Similar logic to history-based but weighted more heavily
  const styles = {};
  favorites.forEach(fav => {
    const style = extractStyle(fav.product_name || fav.productName || '');
    styles[style] = (styles[style] || 0) + 1;
  });
  
  const topStyle = Object.entries(styles)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'casual';
  
  const recommendations = ALL_PRODUCTS
    .filter(p => extractStyle(p.title) === topStyle)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
  
  return recommendations.map(product => ({
    ...product,
    recommendationType: 'based-on-favorites',
    badge: 'Based on Your Favorites'
  }));
}

/**
 * Get trending/popular items (simulated)
 */
export function getTrendingRecommendations(userGender = 'men', count = 6) {
  const genderProducts = ALL_PRODUCTS.filter(p => p.gender === userGender);
  
  // Simulate trending by picking random items (in real app, use actual analytics)
  const trending = genderProducts
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
  
  return trending.map(product => ({
    ...product,
    recommendationType: 'trending',
    badge: 'Trending Now'
  }));
}

/**
 * Get random recommendations (fallback)
 */
export function getRandomRecommendations(count = 6) {
  return ALL_PRODUCTS
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(product => ({
      ...product,
      recommendationType: 'new',
      badge: 'You May Like'
    }));
}

/**
 * Get recommendations for closet page based on saved looks
 */
export function getClosetBasedRecommendations(savedLooks, closetItems, count = 6) {
  const allItems = [...(savedLooks || []), ...(closetItems || [])];
  
  if (allItems.length === 0) {
    return getRandomRecommendations(count);
  }
  
  // Analyze style preferences
  const styleCounts = {};
  allItems.forEach(item => {
    const style = extractStyle(item.product_name || item.productName || '');
    styleCounts[style] = (styleCounts[style] || 0) + 1;
  });
  
  const dominantStyle = Object.entries(styleCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'casual';
  
  // Map styles to suggested styles
  const styleMapping = {
    casual: ['casual', 'trendy', 'sport'],
    formal: ['formal', 'business', 'vintage'],
    party: ['party', 'trendy', 'formal'],
    sport: ['sport', 'casual'],
    vintage: ['vintage', 'formal', 'casual'],
    trendy: ['trendy', 'casual', 'party']
  };
  
  const suggestedStyles = styleMapping[dominantStyle] || ['casual'];
  
  const recommendations = ALL_PRODUCTS
    .filter(p => suggestedStyles.includes(extractStyle(p.title)))
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
  
  const badgeText = dominantStyle === 'casual' 
    ? 'More Casual Wear' 
    : dominantStyle === 'party' 
    ? 'More Party Wear'
    : 'Recommended for You';
  
  return recommendations.map(product => ({
    ...product,
    recommendationType: 'closet-based',
    badge: badgeText
  }));
}

/**
 * Get mixed recommendations (variety of sources)
 */
export function getMixedRecommendations(userHistory, userFavorites, userGender, count = 9) {
  const recommendations = [];
  
  // 3 history-based
  if (userHistory?.length > 0) {
    recommendations.push(...getHistoryBasedRecommendations(userHistory, 3));
  }
  
  // 3 favorites-based
  if (userFavorites?.length > 0) {
    recommendations.push(...getFavoritesBasedRecommendations(userFavorites, 3));
  }
  
  // 3 trending
  recommendations.push(...getTrendingRecommendations(userGender, 3));
  
  // Fill with random if needed
  while (recommendations.length < count) {
    recommendations.push(...getRandomRecommendations(1));
  }
  
  return recommendations.slice(0, count);
}