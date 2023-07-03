export class AuthDto {
  token: string;
  expireTime: number;
}

export class ChangeTokenDto {
  accessToken: string;
  accessTokenExpireTime: number;
  refreshToken: string;
}
