export const Queues = {
  activity: 'activity',
  challenge: 'challenge',
  auth: 'auth'
} as const;

export const ActivityJobs = {
  import: 'import',
} as const;

export const AuthJobs = {
  sendMail: 'send-mail',
} as const;


export const ChallengeJobs = {
  importActivity: 'import-activity',
} as const;
