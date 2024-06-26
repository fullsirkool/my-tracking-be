import { Injectable } from '@nestjs/common';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { CompletePaymentDto, CreatePaymentDto, FindPaymentDto } from './payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { PaymentType, Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as moment from 'moment-timezone';
import { getDefaultPaginationReponse } from '../../utils/pagination.utils';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('challenge') private readonly challengeTaskQueue: Queue,
  ) {
  }

  async find(findPaymentDto: FindPaymentDto) {
    const { createdAt, query, page, size } = findPaymentDto;
    const skip = (page - 1) * size;
    const filter: Prisma.PaymentWhereInput = {};
    if (createdAt) {
      const startOfDay = moment(new Date(createdAt))
        .tz('Asia/Bangkok')
        .startOf('day')
        .toDate();
      const endOfDay = moment(new Date(createdAt))
        .tz('Asia/Bangkok')
        .endOf('day')
        .toDate();
      filter.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    if (query) {
      filter.OR = [
        {
          challenge: {
            title: {
              mode: 'insensitive',
              contains: query,
            },
          },
        },
        {
          user: {
            name: {
              mode: 'insensitive',
              contains: query,
            },
          },
        },
      ];
    }
    const [payments, count] = await Promise.all([
      this.prisma.payment.findMany({
        where: filter,
        skip,
        take: size,
        include: {
          challenge: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: true,
              name: true,
              stravaId: true,
            },
          },
        },
      }),
      this.prisma.payment.count({
        where: filter,
      }),
    ]);
    return {
      ...getDefaultPaginationReponse(findPaymentDto, count),
      data: payments,
    };
  }

  async create(createPaymentDto: CreatePaymentDto) {
    const { userId, challengeId, amount } = createPaymentDto;

    const createdPayment = await this.prisma.payment.findUnique({
      where: {
        userId_challengeId_paymentType: {
          userId,
          challengeId,
          paymentType: PaymentType.REGIST_FEE,
        },
      },
    });

    let paymentId = createdPayment?.id;
    const paymentCode = createdPayment ? createdPayment.paymentCode : moment().tz('Asia/Bangkok').toDate().getTime();
    if (!createdPayment) {
      const payment = await this.prisma.payment.create({
        data: {
          userId,
          challengeId,
          amount,
          paymentCode: `${paymentCode}`,
        },
      });
      paymentId = payment.id;
    }

    const accountNo = process.env.BANK_ACCOUNT_NUMBER;
    const accountName = process.env.BANK_ACCOUNT_NAME;
    const acqId = process.env.BANK_ACCOUNT_BIN;
    const bankName = process.env.BANK_NAME;

    const generateApiUrl = `${process.env.VIETQR_API}/generate`;
    const payload = {
      accountNo,
      acqId,
      accountName,
      amount: amount,
      addInfo: `JOINCHALLENGE ${paymentCode}`,
      format: 'text',
      template: 'compact',
    };
    const headers = {
      'x-client-id': process.env.VIETQR_CLIENT_ID,
      'x-api-key': process.env.VIETQR_API_KEY,
    };

    const { data } = await firstValueFrom(
      this.httpService
        .post(generateApiUrl, payload, {
          headers,
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );

    return {
      ...data.data,
      paymentCode,
      accountNo,
      bankName,
      tiketPrice: amount,
      paymentMessage: `JOINCHALLENGE ${paymentCode}`,
    };
  }

  async complete(completePaymentDto: CompletePaymentDto) {
    const { message } = completePaymentDto;
    const paymentCode = this.desctructMessage(message);
    const payment = await this.prisma.payment.findUnique({
      where: {
        paymentCode,
      },
    });

    const { challengeId, userId } = payment;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: {
          paymentCode,
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      }),
      this.prisma.challengeUser.create({
        data: {
          challenge: {
            connect: {
              id: challengeId,
            },
          },
          user: {
            connect: {
              id: userId,
            },
          },
        },
      }),
    ]);

    this.eventEmitter.emit(`complete-payment/${paymentCode}`, {
      data: { paymentCode },
    });

    await this.challengeTaskQueue.add('import-activity', {
      userId,
      challengeId,
    });
    return { success: true };
  }

  private desctructMessage(sms) {
    const amountRegex = /(\+|-)[\d,]+/;
    const contentRegex = /ND: JOINCHALLENGE (\d+)/;
    const match = sms.match(contentRegex);
    const amountMatch = sms.match(amountRegex);
    const transferredAmount = amountMatch
      ? parseFloat(amountMatch[0].replace(/[\+,]/g, ''))
      : null;

    if (match && transferredAmount) {
      const extractedText = match[1];
      console.log(extractedText);
      return extractedText;
    }
    return null;
  }
}
