import { Injectable } from '@nestjs/common';
import { ConfirmAccountDto } from './email.dto';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';
import * as process from 'process';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'Google',
      host: process.env.MAIL_HOST,
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_ADDRESS,
        pass: process.env.MAIL_APP_PASSWORD,
      },
    });
  }

  async confirmAccount(data: ConfirmAccountDto) {
    const { to, subject, url } = data;
    const templatePath = path.resolve(
      __dirname,
      'templates',
      'mail.account.confirm.ejs',
    );
    const renderedHTML = await ejs.renderFile(templatePath, { url });
    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.MAIL_ADDRESS,
      to,
      subject,
      html: renderedHTML,
    };
    await this.transporter.sendMail(mailOptions);

    return { success: true };
  }
}
