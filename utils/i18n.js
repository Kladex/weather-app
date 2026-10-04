import dictionary from "./translations.json";

const keys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fragments = new RegExp(keys.map(escape).join("|"), "g");

export function makeTranslator(language) {
  return (value) => {
    if (typeof value !== "string") return value;
    const key = value.trim();
    if (dictionary[key]) return value.replace(key, dictionary[key][language]);
    // Dynamic labels combine fixed UI phrases with names and numbers.
    return value.replace(fragments, (match) => dictionary[match][language]);
  };
}

export function formatWatchTime(value, language) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return language === "th" ? "ไม่ทราบเวลา" : "Unknown time";
  return new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
