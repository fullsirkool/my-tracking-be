import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import {ChallengeJobs, Queues} from 'src/types/queue.type';
import {ChallengeService} from "./challenge.service";

@Processor(Queues.challenge)
export class ChallengeConsumer {
    constructor(private readonly challengeService: ChallengeService) {}

    @Process(ChallengeJobs.importActivity)
    async handleJoinChallenge({ data }: Job) {
        const {userId, challengeId} = data
        return this.challengeService.importActivitiesAfterJoinChallenge(userId, challengeId);
    }
}
