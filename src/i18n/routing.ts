import { defineRouting } from "next-intl/routing";
export const routing = defineRouting({locales:["en","ar"],defaultLocale:"en",localePrefix:"always",localeDetection:true,localeCookie:{name:"NEXT_LOCALE",maxAge:31536000,sameSite:"lax"}});
export type Locale = (typeof routing.locales)[number];
