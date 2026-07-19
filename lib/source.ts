const SOURCE_LABELS: Array<[RegExp, string]> = [
  [/iprice\.ph$/i, "iPrice"],
  [/coupons\.rappler\.com$/i, "Rappler Coupons"],
  [/wethrift\.com$/i, "Wethrift"],
  [/picodi\.com$/i, "Picodi"],
  [/everysaving\.ph$/i, "EverySaving"],
  [/(^|\.)worthepenny\.com$/i, "WorthePenny"],
  [/ivouchercodes\.ph$/i, "iVoucherCodes"],
  [/reddit\.com$/i, "Reddit"],
  [/facebook\.com$/i, "Facebook"],
  [/grab\.com$/i, "Grab"],
  [/angkas\.com$/i, "Angkas"],
  [/moveit\.com\.ph$/i, "Move It"],
  [/joyride\.com\.ph$/i, "JoyRide"],
  [/indrive\.com$/i, "inDrive"]
];

export function sourceSiteName(sourceUrl: string) {
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./i, "");
    return SOURCE_LABELS.find(([pattern]) => pattern.test(host))?.[1] ?? host;
  } catch {
    return "Source";
  }
}
