export class CreateUserDto {
  stravaId: number;
  firstName: string;
  lastName: string;
  bio: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  profileMedium: string;
  profile: string;
  tokenType: string;
  accessToken: string;
  accessTokenExpireTime: number;
  refreshToken: string;
}