import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  url: process.env.APP_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    allowedTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
  },
  fiscal: {
    tvaStandard: parseFloat(process.env.TVA_STANDARD || '19'),
    tvaReduit: parseFloat(process.env.TVA_REDUIT || '9'),
    timbreFiscal: parseFloat(process.env.TIMBRE_FISCAL || '50'),
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
}));
