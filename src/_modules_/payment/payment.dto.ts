export class CreatePaymentDto {
  userId: number;
  challengeId: number;
  amount: number;
}

export class CompletePaymentDto {
  message: string;
}