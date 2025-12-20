// Production environment configuration
// For deployment, you can:
// 1. Use relative URLs if frontend and backend are on same domain (via nginx proxy)
// 2. Use absolute URLs if backend is on different domain
// 3. Use environment-specific builds with different values

// Helper to get API URL - supports both relative and absolute URLs
function getApiUrl(): string {
  // If using nginx proxy, use relative URL
  // If backend is on different domain, use absolute URL
  // You can also use window.location.origin for same-origin requests
  return 'https://veasyo.com/devapi'; // Change to your backend URL
}

// Helper to get Socket URL - should match API URL domain
function getSocketUrl(): string {
  // Socket.IO should use same domain as API
  // If using nginx proxy, use relative URL
  // If backend is on different domain, use absolute URL
  return 'https://veasyo.com/devsocket'; // Change to your backend URL
}

export const environment = {
  production: true,
  apiUrl: getApiUrl(),
  socketUrl: getSocketUrl(),
  domainURL: 'https://veasyo.com', // Change to your domain
  contactusEmail: 'saadyehahmmad@gmail.com', // Change to your support email
  defaultLanguage: 'ar',
  supportedLanguages: ['en', 'ar'],
};

