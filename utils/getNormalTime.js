export default function getNormalTime(unixTime, timezoneOffset = 0) {
  const date = new Date((unixTime + timezoneOffset) * 1000);
  return [date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
