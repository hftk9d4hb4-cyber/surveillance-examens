export function preferenceScore(weight: number) { if (weight > 0) return 15; if (weight < 0) return -10; return 0; }
export function overlapsAbsence(date: Date, startDate: Date, endDate: Date) { const t=date.getTime(); return t>=startDate.getTime()&&t<=endDate.getTime(); }
