export class EmailDto {
  to: string;
  subject?: string;
  text?: string;
}

export class ConfirmAccountDto extends EmailDto {
  url: string;
}
