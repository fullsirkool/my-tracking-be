import {Processor, Process} from '@nestjs/bull';
import {Job} from 'bull';
import {AuthJobs, Queues} from 'src/types/queue.type';
import {MailService} from "../mail/mail.service";

@Processor(Queues.auth)
export class AuthConsumer {
    constructor(private readonly mailService: MailService) {
    }

    @Process(AuthJobs.sendMail)
    async handleSendMail({data}: Job) {
        const {email, url} = data
        return this.mailService.confirmAccount({to: email, url, subject: 'Welcome To My Tracking'})
    }
}
