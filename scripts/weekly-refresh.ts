import "dotenv/config";
import { refreshPublicEntitiesWeekly } from "@/lib/services/weekly-refresh";

const limit = Number(process.env.IP_WEEKLY_REFRESH_LIMIT || 12);
const minAgeDays = Number(process.env.IP_WEEKLY_REFRESH_MIN_AGE_DAYS || 7);

const result = await refreshPublicEntitiesWeekly({ limit, minAgeDays });
console.log(JSON.stringify(result, null, 2));
