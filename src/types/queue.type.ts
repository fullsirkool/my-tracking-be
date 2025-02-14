export const Queues = {
  activity: 'activity',
  challenge: 'challenge',
  auth: 'auth',
  notification: 'notification'
} as const;

export const ActivityJobs = {
  import: 'import',
  importFirst: 'import-first',
} as const;

export const AuthJobs = {
  sendMail: 'send-mail',
} as const;

export const ChallengeJobs = {
  importActivity: 'import-activity',
} as const;

export const NotificationJobs = {
  sendTelegram: 'send-telegram',
}