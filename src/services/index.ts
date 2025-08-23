// Service exports
export { ImageService } from './imageService';

// Re-export service types
export type { 
  ImageProcessingOptions,
  ImageUploadResult,
  ThumbnailOptions,
  WatermarkOptions 
} from './imageService.types';

// Service registry for dependency injection (if needed)
export const services = {
  image: 'ImageService',
} as const;

export type ServiceName = keyof typeof services;