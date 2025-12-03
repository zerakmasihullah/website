# Oscar Website - Next.js Frontend

A modern, responsive restaurant ordering website built with Next.js, React, and Tailwind CSS.

## Features

- 🍕 **Menu Browsing** - Browse menu items by categories with smooth scrolling
- 🛒 **Shopping Cart** - Add items to cart with size and topping customization
- 💳 **Payment Integration** - Stripe payment processing for online orders
- 👤 **User Authentication** - Login, registration, and profile management
- 📍 **Location Services** - Map-based location picker with geolocation
- 🌓 **Theme Support** - Light and dark mode themes
- 📱 **Responsive Design** - Mobile-first responsive design
- ⚡ **Performance Optimized** - Caching for faster load times

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Laravel backend API running (see backend README)

## Getting Started

### 1. Install Dependencies


```bash
npm install
# or
yarn install
# or
pnpm install
```

### 2. Environment Setup

Create a `.env.local` file in the root of the `front` directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

For production, use your production API URL:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```


### 3. Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
front/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── page.tsx      # Home/Menu page
│   │   ├── checkout/     # Checkout page
│   │   ├── orders/       # Orders page
│   │   └── order-success/ # Order success page
│   ├── components/       # React components
│   │   ├── header.tsx
│   │   ├── basket-sidebar.tsx
│   │   ├── product-modal.tsx
│   │   └── ...
│   └── lib/
│       └── api.ts        # API service layer
├── public/               # Static assets
└── package.json
```

## API Integration

The frontend communicates with a Laravel backend API. The API service is centralized in `src/lib/api.ts` and includes:

- Authentication (login, register, logout)
- Menu data fetching (categories, items, popular items)
- Order placement and management
- User profile management
- Stripe payment integration

### API Configuration

Set the `NEXT_PUBLIC_API_URL` environment variable to point to your backend API.

## Caching Strategy

The application implements intelligent caching for improved performance:

- **Menu Categories**: Cached for 24 hours
- **All Menu Items**: Cached for 2 hours
- **Popular Items**: Cached for 2 hours
- **Category Items**: Cached per category for 2 hours
- **Individual Items**: Cached per item for 2 hours

Cache automatically refreshes when expired and falls back to cached data if API fails.

## Key Technologies

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **next-themes** - Theme management
- **react-leaflet** - Map integration
- **Lucide React** - Icon library

## Development

### Code Style

- TypeScript for type safety
- ESLint for code linting
- Consistent component structure
- Error handling and validation

### Environment Variables

All environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

## Deployment

### Vercel (Recommended)

1. Import your repository in Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

Make sure to set the `NEXT_PUBLIC_API_URL` environment variable in your deployment platform.

## Troubleshooting

### API Connection Issues

- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings on backend
- Ensure backend API is running and accessible

### Build Errors

- Clear `.next` folder and rebuild
- Check for TypeScript errors: `npm run lint`
- Verify all dependencies are installed

### Cache Issues

To clear all caches, use the browser's developer console:

```javascript
localStorage.clear()
```

Or use the provided `clearMenuCache()` function in development.

## License

Private project - All rights reserved
