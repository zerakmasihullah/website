/**
 * Helper function to get image URL
 * Constructs direct image URLs without proxy
 */
export function getImageUrl(imageUrl: string | undefined | null): string | null {
  if (!imageUrl) return null;
  
  // If URL is already complete, normalize it to use order.oscarlimerick.com
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    // Convert any oscarlimerick.com subdomain to order.oscarlimerick.com for images
    if (imageUrl.includes('oscarlimerick.com')) {
      // Replace any subdomain (www., order., or none) with order.
      imageUrl = imageUrl.replace(/https?:\/\/([^/]*\.)?oscarlimerick\.com/, 'https://order.oscarlimerick.com');
    }
    return imageUrl;
  }
  
  // If it's a relative URL, construct full URL with order.oscarlimerick.com
  if (imageUrl.startsWith('/storage/')) {
    return `https://order.oscarlimerick.com${imageUrl}`;
  }
  
  // Return null if we can't determine the URL format
  return null;
}

