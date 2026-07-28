export interface Property {
  id: string;

  title: string;

  neighborhood: string;

  address?: string;

  guests: number;

  bedrooms: number;

  bathrooms: number;

  beds: number;

  suites: number;

  area: number;

  garage: number;

  petFriendly: boolean;

  pool: boolean;

  barbecue: boolean;

  wifi: boolean;

  airConditioning: boolean;

  kitchen: boolean;

  washingMachine: boolean;

  beachDistance: string;

  checkin: string;

  checkout: string;

  price: number;

  cleaningFee: number;

  image: string;

  gallery: string[];

  description: string;

  amenities: string[];

  rules: string[];

  airbnb: string;

  booking?: string;

  whatsapp: string;

  rating: number;

  reviews: number;

  latitude?: number;

  longitude?: number;

  keywords: string[];
}