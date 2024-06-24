import { Admin, AdminStatus, User } from '@prisma/client';

export type Claims = Omit<Admin, 'password'>;

export type AuthStatus = AdminStatus | 'ALL';

export type UserClaims = Pick<
  User,
  'id' | 'stravaId' | 'firstName' | 'lastName' | 'profile'
>;

export type AuthRole = 'RUNNER' | 'ADMIN' | 'ALL';
