export default function useCalculateTime(unixTime) {
  let date = new Date(unixTime * 1000);
  let hours = date.getHours() < 9 ? "0" + date.getHours() : date.getHours();
  let minutes = "0" + date.getMinutes();
  let seconds = "0" + date.getSeconds();

  let formattedTime = `${hours}:${minutes.substr(-2)}:${seconds.substr(-2)}`;
  return formattedTime;
}
