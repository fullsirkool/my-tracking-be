import * as moment from 'moment-timezone';
export enum DateRangeType {
    MONTH = "months",
    DAY = "days"
}
export const getDateRange = (dateString : string, timezone: string, range?: DateRangeType) => {
    if (!dateString) {
        return
    }

    const formattedDate = moment(dateString).tz(timezone).utcOffset(0)
    const firstDate = moment(formattedDate).startOf('day').format('YYYY-MM-DD 00:00:00');
    const secondDate = moment(formattedDate).add(1, range).startOf('day').format('YYYY-MM-DD 00:00:00');
    return [firstDate, secondDate]
}


export const getStartDateFormattedWithoutTimezone = (dateString : string, timezone: string) => {
    if (!dateString) {
        return
    }

    const formattedDate = moment(dateString).tz(timezone).utcOffset(0)
    return moment(formattedDate).startOf('day').format('YYYY-MM-DD 00:00:00');
}