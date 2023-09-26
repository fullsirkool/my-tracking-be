import { Admin, AdminStatus } from '@prisma/client';

export type Claims = Omit<Admin, 'password' | 'refreshToken'>;

export type AuthStatus = AdminStatus | 'ALL';
