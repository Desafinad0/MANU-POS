export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'manu-aguachiles-dev-secret',
  expiration: process.env.JWT_EXPIRATION || '8h',
};
