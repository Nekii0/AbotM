// Current Baguio weather from Open-Meteo (free, no key). Fills <div id="weather">.
const WMO = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  80: "Rain showers", 81: "Rain showers", 82: "Heavy showers", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm" };
const box = document.getElementById("weather");

if (box) {
  fetch("https://api.open-meteo.com/v1/forecast?latitude=16.4023&longitude=120.596&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FManila")
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(({ current: c }) => {
      box.querySelector(".temp").textContent = Math.round(c.temperature_2m) + "°C";
      box.querySelector(".sky").textContent = WMO[c.weather_code] ?? "—";
      box.querySelector(".extra").textContent = `Humidity ${c.relative_humidity_2m}% · Wind ${Math.round(c.wind_speed_10m)} km/h`;
    })
    .catch(() => { box.querySelector(".sky").textContent = "Weather unavailable right now."; });
}
