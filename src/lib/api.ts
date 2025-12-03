// API service for Laravel backend with improved security, error handling, and functionality
// Ensure API_BASE_URL is always an absolute URL and never uses location.host
function getApiBaseUrl(): string {
  // Get from environment variable (set at build time)
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // If environment variable is set and is an absolute URL, use it
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    let url = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    // Normalize: convert oscarlimerick.com/api to order.oscarlimerick.com/api
    if (url.includes('oscarlimerick.com/api') && !url.includes('order.oscarlimerick.com')) {
      url = url.replace(/https?:\/\/([^/]*\.)?oscarlimerick\.com\/api/, 'https://order.oscarlimerick.com/api');
    }
    return url;
  }
  
  // Fallback to production API URL (never use location.host)
  return 'https://order.oscarlimerick.com/api';
}

const API_BASE_URL = getApiBaseUrl();
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// ==================== Types & Interfaces ====================

export interface Menu {
  id: number;
  title: string;
  name?: string;
  image: string;
  description?: string;
}

export interface MenuItem {
  id: number;
  menu_id: number;
  title: string;
  description: string;
  image: string;
  price: string | number;
  average_rating?: number;
  rating_count?: number;
  size?: Array<{
    id: number;
    menu_item_id: number;
    size: string;
    price: string | number;
  }>;
  topping?: Array<{
    id: number;
    name: string;
    required: number; // This is the required amount (number of selections needed)
    is_optional: boolean;
    attachments: Array<{
      id: number;
      name: string;
      price: string | number;
    }>;
  }>;
  menu?: Menu;
}

export interface ApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface Drink {
  id: number;
  name: string;
  price: number | string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  image?: string;
  role?: number;
  latitude?: string;
  longitude?: string;
  area_code?: string;
  address?: string;
}

export interface LoginResponse {
  user: User;
  token: string;
  token_type: string;
}

export interface RegisterResponse {
  status: boolean;
  message: string;
  user: User;
}

export interface PlaceOrderData {
  total_price: number;
  customer: number;
  description?: string;
  phone_number: string;
  payment_method: 'cash' | 'online';
  area_code: string;
  houseadress: string;
  apartment?: string;
  longitude: string;
  latitude: string;
  date: string;
  time: string;
  delivery_type: 'delivery' | 'collection';
  order_items: Array<{
    food: number;
    quantity: number;
    size?: number;
    price: number;
    attachments?: Array<{
      id: number;
      quantity: number;
    }>;
  }>;
  payment_details?: {
    paymentIntentId?: string;
  };
}

export interface PlaceOrderResponse {
  success: boolean;
  message: string;
  order_id?: number;
  error?: string;
}

// ==================== Security & Validation ====================

// Sanitize input to prevent XSS
function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Validate email format
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number (basic validation)
function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8;
}

// Validate and sanitize order data
function validateOrderData(orderData: PlaceOrderData): { valid: boolean; error?: string } {
  if (!orderData.customer || orderData.customer <= 0) {
    return { valid: false, error: 'Invalid customer ID' };
  }
  if (!orderData.phone_number || !validatePhone(orderData.phone_number)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  if (orderData.total_price <= 0) {
    return { valid: false, error: 'Invalid total price' };
  }
  if (!orderData.order_items || orderData.order_items.length === 0) {
    return { valid: false, error: 'Order must contain at least one item' };
  }
  if (orderData.delivery_type === 'delivery' && !orderData.houseadress) {
    return { valid: false, error: 'Delivery address is required' };
  }
  return { valid: true };
}

// ==================== Token Management ====================

// Secure token storage with expiration check
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';
const TOKEN_EXPIRY_KEY = 'token_expiry';

function setAuthToken(token: string, expiresIn?: number): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
    if (expiresIn) {
      const expiryTime = Date.now() + expiresIn * 1000;
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
    }
  } catch (error) {
  }
}

function getAuthToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    
    // Check token expiry
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiry && Date.now() > parseInt(expiry)) {
      clearAuthData();
      return null;
    }
    
    return token;
  } catch (error) {
    return null;
  }
}

function clearAuthData(): void {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (error) {
  }
}

// ==================== Request Utilities ====================

// Create abort controller for timeout
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

// Retry logic for failed requests
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  const controller = createTimeoutController(REQUEST_TIMEOUT);
  
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      // If successful or client error (4xx), don't retry
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Server error (5xx), retry if attempts remaining
      if (i < retries && response.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        continue;
      }
      
      return response;
    } catch (error: any) {
      // Network error or timeout, retry if attempts remaining
      if (i < retries && (error.name === 'AbortError' || error.name === 'TypeError')) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Request failed after retries');
}

// Enhanced fetch wrapper with error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth: boolean = false
): Promise<T> {
  const token = getAuthToken();
  
  // Validate endpoint
  if (!endpoint || typeof endpoint !== 'string') {
    throw new Error('Invalid API endpoint');
  }
  
  if (requireAuth && !token) {
    throw new Error('Authentication required');
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add auth token if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add Content-Type for JSON requests
  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetchWithRetry(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - token expired
    if (response.status === 401) {
      clearAuthData();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
      throw new Error('Session expired. Please login again.');
    }

    // Handle 403 Forbidden
    if (response.status === 403) {
      throw new Error('Access denied. You do not have permission to perform this action.');
    }

    // Handle 429 Too Many Requests
    if (response.status === 429) {
      throw new Error('Too many requests. Please try again later.');
    }

    // Parse response
    let data: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Invalid response format: ${text.substring(0, 100)}`);
      }
    }

    // Check for API-level errors
    if (!response.ok) {
      const errorMessage = data.message || 
        (data.errors ? Object.values(data.errors).flat().join(', ') : null) ||
        `Request failed with status ${response.status}`;
      const error: any = new Error(errorMessage);
      // Preserve validation errors if they exist
      if (data.errors) {
        error.errors = data.errors;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    // Handle network errors
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection and try again.');
    }
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
}

// ==================== API Functions ====================

// Cache configuration
const CATEGORIES_CACHE_KEY = 'menu_categories_cache';
const CATEGORIES_CACHE_EXPIRY_KEY = 'menu_categories_cache_expiry';
const CATEGORIES_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const ALL_MENU_ITEMS_CACHE_KEY = 'all_menu_items_cache';
const ALL_MENU_ITEMS_CACHE_EXPIRY_KEY = 'all_menu_items_cache_expiry';
const ALL_MENU_ITEMS_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours

const POPULAR_MENU_ITEMS_CACHE_KEY = 'popular_menu_items_cache';
const POPULAR_MENU_ITEMS_CACHE_EXPIRY_KEY = 'popular_menu_items_cache_expiry';
const POPULAR_MENU_ITEMS_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours

const MENU_ITEMS_BY_CATEGORY_CACHE_PREFIX = 'menu_items_category_';
const MENU_ITEMS_BY_CATEGORY_CACHE_EXPIRY_PREFIX = 'menu_items_category_expiry_';
const MENU_ITEMS_BY_CATEGORY_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours

const MENU_ITEM_BY_ID_CACHE_PREFIX = 'menu_item_id_';
const MENU_ITEM_BY_ID_CACHE_EXPIRY_PREFIX = 'menu_item_id_expiry_';
const MENU_ITEM_BY_ID_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours

// Generic cache helper functions
function getCachedData<T>(cacheKey: string, expiryKey: string, cacheDuration: number): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cachedData = localStorage.getItem(cacheKey);
    const cacheExpiry = localStorage.getItem(expiryKey);
    
    if (cachedData && cacheExpiry) {
      const expiryTime = parseInt(cacheExpiry, 10);
      if (Date.now() < expiryTime) {
        return JSON.parse(cachedData) as T;
      } else {
        // Cache expired, clear it
        localStorage.removeItem(cacheKey);
        localStorage.removeItem(expiryKey);
      }
    }
  } catch (error) {
    // If parsing fails, clear cache
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(expiryKey);
  }
  
  return null;
}

function setCachedData<T>(cacheKey: string, expiryKey: string, cacheDuration: number, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data));
    localStorage.setItem(expiryKey, (Date.now() + cacheDuration).toString());
  } catch (error) {
    // If caching fails, continue without cache
  }
}

function getCachedDataWithFallback<T>(
  cacheKey: string,
  expiryKey: string,
  cacheDuration: number
): T | null {
  // Try valid cache first
  const cached = getCachedData<T>(cacheKey, expiryKey, cacheDuration);
  if (cached !== null) return cached;
  
  // Try expired cache as fallback
  if (typeof window !== 'undefined') {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
    } catch (error) {
      // If parsing fails, return null
    }
  }
  
  return null;
}

// Fetch all menu categories (with caching)
export async function getMenuCategories(): Promise<Menu[]> {
  try {
    // Check cache first
    const cached = getCachedData<Menu[]>(
      CATEGORIES_CACHE_KEY,
      CATEGORIES_CACHE_EXPIRY_KEY,
      CATEGORIES_CACHE_DURATION
    );
    if (cached !== null) return cached;

    // Fetch fresh data from API
    const data = await apiRequest<ApiResponse<Menu[]>>('/food-category');
    const categories = data.status && data.data ? data.data : [];
    
    // Cache the data
    if (categories.length > 0) {
      setCachedData(CATEGORIES_CACHE_KEY, CATEGORIES_CACHE_EXPIRY_KEY, CATEGORIES_CACHE_DURATION, categories);
    }
    
    return categories;
  } catch (error: any) {
    // If API fails, try to return cached data even if expired
    const cached = getCachedDataWithFallback<Menu[]>(
      CATEGORIES_CACHE_KEY,
      CATEGORIES_CACHE_EXPIRY_KEY,
      CATEGORIES_CACHE_DURATION
    );
    return cached || [];
  }
}

// Clear all menu caches (useful for manual refresh)
export function clearMenuCache(): void {
  if (typeof window === 'undefined') return;
  
  // Clear categories cache
  localStorage.removeItem(CATEGORIES_CACHE_KEY);
  localStorage.removeItem(CATEGORIES_CACHE_EXPIRY_KEY);
  
  // Clear all menu items cache
  localStorage.removeItem(ALL_MENU_ITEMS_CACHE_KEY);
  localStorage.removeItem(ALL_MENU_ITEMS_CACHE_EXPIRY_KEY);
  
  // Clear popular items cache
  localStorage.removeItem(POPULAR_MENU_ITEMS_CACHE_KEY);
  localStorage.removeItem(POPULAR_MENU_ITEMS_CACHE_EXPIRY_KEY);
  
  // Clear all category-specific caches
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith(MENU_ITEMS_BY_CATEGORY_CACHE_PREFIX) ||
      key.startsWith(MENU_ITEMS_BY_CATEGORY_CACHE_EXPIRY_PREFIX) ||
      key.startsWith(MENU_ITEM_BY_ID_CACHE_PREFIX) ||
      key.startsWith(MENU_ITEM_BY_ID_CACHE_EXPIRY_PREFIX)
    )) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

// Clear categories cache (useful for manual refresh)
export function clearCategoriesCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CATEGORIES_CACHE_KEY);
    localStorage.removeItem(CATEGORIES_CACHE_EXPIRY_KEY);
  }
}

// Fetch menu items by category ID (with caching)
export async function getMenuItemsByCategory(categoryId: number): Promise<MenuItem[]> {
  try {
    if (!categoryId || categoryId <= 0) {
      throw new Error('Invalid category ID');
    }
    
    const cacheKey = `${MENU_ITEMS_BY_CATEGORY_CACHE_PREFIX}${categoryId}`;
    const expiryKey = `${MENU_ITEMS_BY_CATEGORY_CACHE_EXPIRY_PREFIX}${categoryId}`;
    
    // Check cache first
    const cached = getCachedData<MenuItem[]>(cacheKey, expiryKey, MENU_ITEMS_BY_CATEGORY_CACHE_DURATION);
    if (cached !== null) return cached;
    
    // Fetch fresh data from API
    const data = await apiRequest<ApiResponse<MenuItem[]>>(`/food-category/${categoryId}`);
    const items = data.status && data.data ? data.data : [];
    
    // Cache the data
    if (items.length > 0) {
      setCachedData(cacheKey, expiryKey, MENU_ITEMS_BY_CATEGORY_CACHE_DURATION, items);
    }
    
    return items;
  } catch (error: any) {
    // If API fails, try to return cached data even if expired
    const cacheKey = `${MENU_ITEMS_BY_CATEGORY_CACHE_PREFIX}${categoryId}`;
    const expiryKey = `${MENU_ITEMS_BY_CATEGORY_CACHE_EXPIRY_PREFIX}${categoryId}`;
    const cached = getCachedDataWithFallback<MenuItem[]>(cacheKey, expiryKey, MENU_ITEMS_BY_CATEGORY_CACHE_DURATION);
    return cached || [];
  }
}

// Fetch all menu items (with caching)
export async function getAllMenuItems(): Promise<MenuItem[]> {
  try {
    // Check cache first
    const cached = getCachedData<MenuItem[]>(
      ALL_MENU_ITEMS_CACHE_KEY,
      ALL_MENU_ITEMS_CACHE_EXPIRY_KEY,
      ALL_MENU_ITEMS_CACHE_DURATION
    );
    if (cached !== null) return cached;

    // Fetch fresh data from API
    const data = await apiRequest<ApiResponse<MenuItem[]>>('/food-menu');
    const items = data.status && data.data ? data.data : [];
    
    // Cache the data
    if (items.length > 0) {
      setCachedData(ALL_MENU_ITEMS_CACHE_KEY, ALL_MENU_ITEMS_CACHE_EXPIRY_KEY, ALL_MENU_ITEMS_CACHE_DURATION, items);
    }
    
    return items;
  } catch (error: any) {
    // If API fails, try to return cached data even if expired
    const cached = getCachedDataWithFallback<MenuItem[]>(
      ALL_MENU_ITEMS_CACHE_KEY,
      ALL_MENU_ITEMS_CACHE_EXPIRY_KEY,
      ALL_MENU_ITEMS_CACHE_DURATION
    );
    return cached || [];
  }
}

// Fetch menu item by ID (with caching)
export async function getMenuItemById(id: number): Promise<MenuItem | null> {
  try {
    if (!id || id <= 0) {
      return null;
    }
    
    const cacheKey = `${MENU_ITEM_BY_ID_CACHE_PREFIX}${id}`;
    const expiryKey = `${MENU_ITEM_BY_ID_CACHE_EXPIRY_PREFIX}${id}`;
    
    // Check cache first
    const cached = getCachedData<MenuItem>(cacheKey, expiryKey, MENU_ITEM_BY_ID_CACHE_DURATION);
    if (cached !== null) return cached;
    
    // Fetch fresh data from API
    const data = await apiRequest<ApiResponse<MenuItem>>(`/menu-item/${id}`);
    const item = data.status && data.data ? data.data : null;
    
    // Cache the data
    if (item) {
      setCachedData(cacheKey, expiryKey, MENU_ITEM_BY_ID_CACHE_DURATION, item);
    }
    
    return item;
  } catch (error: any) {
    // If API fails, try to return cached data even if expired
    const cacheKey = `${MENU_ITEM_BY_ID_CACHE_PREFIX}${id}`;
    const expiryKey = `${MENU_ITEM_BY_ID_CACHE_EXPIRY_PREFIX}${id}`;
    const cached = getCachedDataWithFallback<MenuItem>(cacheKey, expiryKey, MENU_ITEM_BY_ID_CACHE_DURATION);
    return cached || null;
  }
}

// Fetch popular menu items (with caching)
export async function getPopularMenuItems(): Promise<MenuItem[]> {
  try {
    // Check cache first
    const cached = getCachedData<MenuItem[]>(
      POPULAR_MENU_ITEMS_CACHE_KEY,
      POPULAR_MENU_ITEMS_CACHE_EXPIRY_KEY,
      POPULAR_MENU_ITEMS_CACHE_DURATION
    );
    if (cached !== null) return cached;

    // Fetch fresh data from API
    const data = await apiRequest<ApiResponse<MenuItem[]>>('/popular-menu');
    const items = data.status && data.data ? data.data : [];
    
    // Cache the data
    if (items.length > 0) {
      setCachedData(POPULAR_MENU_ITEMS_CACHE_KEY, POPULAR_MENU_ITEMS_CACHE_EXPIRY_KEY, POPULAR_MENU_ITEMS_CACHE_DURATION, items);
    }
    
    return items;
  } catch (error: any) {
    // If API fails, try to return cached data even if expired
    const cached = getCachedDataWithFallback<MenuItem[]>(
      POPULAR_MENU_ITEMS_CACHE_KEY,
      POPULAR_MENU_ITEMS_CACHE_EXPIRY_KEY,
      POPULAR_MENU_ITEMS_CACHE_DURATION
    );
    return cached || [];
  }
}

// Search menu items
export async function searchMenuItems(query: string): Promise<MenuItem[]> {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }
    const sanitizedQuery = sanitizeInput(query.trim());
    const data = await apiRequest<ApiResponse<MenuItem[]>>(`/search=${encodeURIComponent(sanitizedQuery)}`);
    return data.status && data.data ? data.data : [];
  } catch (error: any) {
    return [];
  }
}

// ==================== Authentication ====================

// Login user
export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    // Validate input
    if (!email || !validateEmail(email)) {
      throw new Error('Please enter a valid email address');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
    
    const data = await apiRequest<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({
        login: sanitizedEmail,
        password: password,
      }),
    });

    // Store token securely
    if (data.token) {
      setAuthToken(data.token);
      if (typeof window !== 'undefined') {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      }
    }

    return data;
  } catch (error: any) {
    throw error;
  }
}

// Register user
export async function register(userData: {
  name: string;
  email: string;
  password: string;
  phone_number: string;
  area_code: string;
  latitude?: string;
  longitude?: string;
}): Promise<RegisterResponse> {
  try {
    // Validate input
    if (!userData.name || userData.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    if (!userData.email || !validateEmail(userData.email)) {
      throw new Error('Please enter a valid email address');
    }
    if (!userData.password || userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (!userData.phone_number || !validatePhone(userData.phone_number)) {
      throw new Error('Please enter a valid phone number');
    }
    if (!userData.area_code || userData.area_code.trim().length === 0) {
      throw new Error('Area code is required');
    }

    const formData = new FormData();
    formData.append('name', sanitizeInput(userData.name.trim()));
    formData.append('email', sanitizeInput(userData.email.trim().toLowerCase()));
    formData.append('password', userData.password);
    formData.append('phone_number', userData.phone_number.trim());
    formData.append('area_code', sanitizeInput(userData.area_code.trim()));
    if (userData.latitude) formData.append('latitude', userData.latitude);
    if (userData.longitude) formData.append('longitude', userData.longitude);

    const data = await apiRequest<RegisterResponse>('/register', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    });

    if (!data.status) {
      const error: any = new Error(data.message || 'Registration failed');
      // Preserve validation errors if they exist
      if ((data as any).errors) {
        error.errors = (data as any).errors;
      }
      throw error;
    }

    return data;
  } catch (error: any) {
    // If it's already an error with errors object, preserve it
    if (error.errors) {
      throw error;
    }
    throw error;
  }
}

// Logout user
export async function logout(): Promise<void> {
  try {
    const token = getAuthToken();
    if (!token) {
      clearAuthData();
      return;
    }

    try {
      await apiRequest('/logout', {
        method: 'POST',
      }, true);
    } catch (error) {
      // Even if logout fails on server, clear local data
    } finally {
      clearAuthData();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }
  } catch (error) {
    clearAuthData();
  }
}

// Get current user from localStorage (with session validation)
export function getCurrentUser(): User | null {
  try {
    if (typeof window === 'undefined') return null;
    
    // First check if token exists and is valid
    const token = getAuthToken();
    if (!token) {
      // Token expired or doesn't exist, clear user data
      clearAuthData();
      return null;
    }
    
    const userStr = localStorage.getItem(USER_KEY);
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  } catch (error) {
    // On error, clear auth data
    clearAuthData();
    return null;
  }
}

// Check if user is authenticated and session is valid
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) {
    // Clear user data if token is invalid
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem(USER_KEY);
      if (userStr) {
        clearAuthData();
      }
    }
    return false;
  }
  return true;
}

// Validate user session - check if user exists and token is valid
export function validateUserSession(): { valid: boolean; user: User | null } {
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token || !user) {
    return { valid: false, user: null };
  }
  
  return { valid: true, user };
}

// ==================== User Profile ====================

// Update user profile
export async function updateProfile(userId: number, userData: {
  name: string;
  email: string;
  phone_number?: string;
  area_code?: string;
  latitude?: string;
  longitude?: string;
  address?: string;
}): Promise<RegisterResponse> {
  try {
    if (!userId || userId <= 0) {
      throw new Error('Invalid user ID');
    }

    // Validate input
    if (!userData.name || userData.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters');
    }
    if (!userData.email || !validateEmail(userData.email)) {
      throw new Error('Please enter a valid email address');
    }
    if (userData.phone_number && !validatePhone(userData.phone_number)) {
      throw new Error('Please enter a valid phone number');
    }

    const formData = new FormData();
    formData.append('name', sanitizeInput(userData.name.trim()));
    formData.append('email', sanitizeInput(userData.email.trim().toLowerCase()));
    if (userData.phone_number) formData.append('phone_number', userData.phone_number.trim());
    if (userData.area_code) formData.append('area_code', sanitizeInput(userData.area_code.trim()));
    if (userData.latitude) formData.append('latitude', userData.latitude);
    if (userData.longitude) formData.append('longitude', userData.longitude);
    if (userData.address) formData.append('address', sanitizeInput(userData.address.trim()));

    const data = await apiRequest<RegisterResponse>(`/user-profile-edit/${userId}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
      },
      body: formData,
    }, true);

    if (!data.status) {
      throw new Error(data.message || 'Profile update failed');
    }

    // Update localStorage with new user data
    if (data.user && typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data;
  } catch (error: any) {
    throw error;
  }
}

// ==================== Orders ====================

// Get customer orders
export async function getCustomerOrders(customerId: number): Promise<any[]> {
  try {
    if (!customerId || customerId <= 0) {
      return [];
    }
    
    const data = await apiRequest<ApiResponse<any[]>>(`/orders/${customerId}`, {
      method: 'GET',
    }, true);
    
    return data.status && data.data ? (Array.isArray(data.data) ? data.data : []) : [];
  } catch (error: any) {
    return [];
  }
}

// Place order
export async function placeOrder(orderData: PlaceOrderData): Promise<PlaceOrderResponse> {
  try {
    // Validate order data
    const validation = validateOrderData(orderData);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid order data');
    }

    const data = await apiRequest<PlaceOrderResponse>('/place-order', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }, true);

    if (!data.success) {
      throw new Error(data.message || data.error || 'Failed to place order');
    }

    return data;
  } catch (error: any) {
    throw error;
  }
}

// ==================== Stripe Billing & Payments ====================

// Create Stripe checkout session
export async function createCheckoutSession(sessionData: {
  order_data: PlaceOrderData;
  items: any[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;
}): Promise<{ url: string }> {
  try {
    const data = await apiRequest<{ url?: string; message?: string }>('/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    }, true);

    if (!data.url) {
      throw new Error(data.message || 'Failed to create payment session');
    }

    return { url: data.url };
  } catch (error: any) {
    throw error;
  }
}

// Get Stripe billing portal URL and redirect
export async function redirectToBillingPortal(): Promise<void> {
  try {
    const data = await apiRequest<{ success: boolean; url?: string; message?: string }>('/billing-portal-url', {
      method: 'GET',
    }, true);

    if (!data.success || !data.url) {
      throw new Error(data.message || 'Failed to get billing portal URL');
    }

    // Open billing portal in a new window with security attributes
    window.open(data.url, '_blank', 'noopener,noreferrer');
  } catch (error: any) {
    throw error;
  }
}

// ==================== Orders by Session ====================

// Get order details by Stripe session ID
export async function getOrderBySession(sessionId: string): Promise<any> {
  try {
    if (!sessionId || sessionId.trim().length === 0) {
      throw new Error('Invalid session ID');
    }
    
    const data = await apiRequest<{ success: boolean; data?: any; message?: string }>(`/order-by-session/${sessionId}`, {
      method: 'GET',
    }, true);

    if (!data.success || !data.data) {
      throw new Error(data.message || 'Failed to fetch order details');
    }

    return data.data;
  } catch (error: any) {
    throw error;
  }
}

// ==================== Drinks/Addons ====================

// Fetch drinks/addons from API
export async function getDrinks(): Promise<Drink[]> {
  try {
    const data = await apiRequest<ApiResponse<Drink[]>>('/drinks');
    
    if (data.status && data.data) {
      return data.data.map((drink) => ({
        id: drink.id,
        name: drink.name,
        price: typeof drink.price === 'number' ? drink.price : parseFloat(String(drink.price)) || 0,
      }));
    }
    return [];
  } catch (error) {
    return [];
  }
}

// ==================== Event Listeners ====================

// Listen for auth logout events
if (typeof window !== 'undefined') {
  window.addEventListener('auth:logout', () => {
    clearAuthData();
  });
}
