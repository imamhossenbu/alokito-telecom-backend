// Accurate Prayer Times calculation service for Bangladesh & Worldwide
// Based on Islamic Foundation Bangladesh / Karachi Calculation Standards (Fajr 18°, Isha 18°, Hanafi Asr)

export interface DistrictCoord {
  name: string;
  bnName: string;
  lat: number;
  lng: number;
}

export const BANGLADESH_DISTRICTS: Record<string, DistrictCoord> = {
  dhaka: { name: "Dhaka", bnName: "ঢাকা", lat: 23.8103, lng: 90.4125 },
  chittagong: { name: "Chittagong", bnName: "চট্টগ্রাম", lat: 22.3569, lng: 91.7832 },
  sylhet: { name: "Sylhet", bnName: "সিলেট", lat: 24.8949, lng: 91.8687 },
  rajshahi: { name: "Rajshahi", bnName: "রাজশাহী", lat: 24.3745, lng: 88.6042 },
  khulna: { name: "Khulna", bnName: "খুলনা", lat: 22.8456, lng: 89.5403 },
  barisal: { name: "Barisal", bnName: "বরিশাল", lat: 22.701, lng: 90.3535 },
  rangpur: { name: "Rangpur", bnName: "রংপুর", lat: 25.7439, lng: 89.2752 },
  mymensingh: { name: "Mymensingh", bnName: "ময়মনসিংহ", lat: 24.7471, lng: 90.4203 },
  comilla: { name: "Comilla", bnName: "কুমিল্লা", lat: 23.4607, lng: 91.1809 },
  coxsbazar: { name: "Cox's Bazar", bnName: "কক্সবাজার", lat: 21.4272, lng: 92.0058 },
  bogura: { name: "Bogura", bnName: "বগুড়া", lat: 24.8465, lng: 89.3777 },
  jessore: { name: "Jessore", bnName: "যশোর", lat: 23.1664, lng: 89.2081 },
  dinajpur: { name: "Dinajpur", bnName: "দিনাজপুর", lat: 25.6217, lng: 88.6355 },
  noakhali: { name: "Noakhali", bnName: "নোয়াখালী", lat: 22.8696, lng: 91.0997 },
  tangail: { name: "Tangail", bnName: "টাঙ্গাইল", lat: 24.2513, lng: 89.9167 },
  faridpur: { name: "Faridpur", bnName: "ফরিদপুর", lat: 23.6071, lng: 89.8429 },
  kushtia: { name: "Kushtia", bnName: "কুষ্টিয়া", lat: 23.9013, lng: 89.1206 },
  pabna: { name: "Pabna", bnName: "পাবনা", lat: 24.0064, lng: 89.2372 },
  brahmanbaria: { name: "Brahmanbaria", bnName: "ব্রাহ্মণবাড়িয়া", lat: 23.9571, lng: 91.1119 },
  gazipur: { name: "Gazipur", bnName: "গাজীপুর", lat: 23.9999, lng: 90.4203 },
  narayanganj: { name: "Narayanganj", bnName: "নারায়ণগঞ্জ", lat: 23.6238, lng: 90.5 },
  feni: { name: "Feni", bnName: "ফেনী", lat: 23.0159, lng: 91.3976 },
  jamalpur: { name: "Jamalpur", bnName: "জামালপুর", lat: 24.9375, lng: 89.9378 },
  sirajganj: { name: "Sirajganj", bnName: "সিরাজগঞ্জ", lat: 24.4534, lng: 89.7008 },
  naogaon: { name: "Naogaon", bnName: "নওগাঁ", lat: 24.7936, lng: 88.9318 },
  bagerhat: { name: "Bagerhat", bnName: "বাগেরহাট", lat: 22.6516, lng: 89.7859 },
  satkhira: { name: "Satkhira", bnName: "সাতক্ষীরা", lat: 22.7185, lng: 89.0705 },
  bhola: { name: "Bhola", bnName: "ভোলা", lat: 22.6859, lng: 90.6481 },
  patuakhali: { name: "Patuakhali", bnName: "পটুয়াখালী", lat: 22.3596, lng: 90.3299 },
  kishoreganj: { name: "Kishoreganj", bnName: "কিশোরগঞ্জ", lat: 24.4449, lng: 90.7766 },
  netrokona: { name: "Netrokona", bnName: "নেত্রকোণা", lat: 24.8709, lng: 90.7279 },
  chandpur: { name: "Chandpur", bnName: "চাঁদপুর", lat: 23.2333, lng: 90.6667 },
  lakshmipur: { name: "Lakshmipur", bnName: "লক্ষ্মীপুর", lat: 22.9425, lng: 90.8412 },
  habiganj: { name: "Habiganj", bnName: "হবিগঞ্জ", lat: 24.375, lng: 91.4167 },
  moulvibazar: { name: "Moulvibazar", bnName: "মৌলভীবাজার", lat: 24.4829, lng: 91.7774 },
  sunamganj: { name: "Sunamganj", bnName: "সুনামগঞ্জ", lat: 25.0658, lng: 91.395 },
  kurigram: { name: "Kurigram", bnName: "কুড়িগ্রাম", lat: 25.8054, lng: 89.6362 },
  gaibandha: { name: "Gaibandha", bnName: "গাইবান্ধা", lat: 25.3288, lng: 89.5408 },
  lalmonirhat: { name: "Lalmonirhat", bnName: "লালমনিরহাট", lat: 25.9923, lng: 89.2847 },
  nilphamari: { name: "Nilphamari", bnName: "নীলফামারী", lat: 25.9318, lng: 88.856 },
  panchagarh: { name: "Panchagarh", bnName: "পঞ্চগড়", lat: 26.3411, lng: 88.5542 },
  thakurgaon: { name: "Thakurgaon", bnName: "ঠাকুরগাঁও", lat: 26.0337, lng: 88.4617 },
  joypurhat: { name: "Joypurhat", bnName: "জয়পুরহাট", lat: 25.0968, lng: 89.0227 },
  chapainawabganj: { name: "Chapai Nawabganj", bnName: "চাঁপাইনবাবগঞ্জ", lat: 24.5965, lng: 88.2775 },
  natore: { name: "Natore", bnName: "নাটোর", lat: 24.4206, lng: 88.9324 },
  chuadanga: { name: "Chuadanga", bnName: "চুয়াডাঙ্গা", lat: 23.6402, lng: 88.8418 },
  meherpur: { name: "Meherpur", bnName: "মেহেরপুর", lat: 23.7622, lng: 88.6318 },
  jhenaidah: { name: "Jhenaidah", bnName: "ঝিনাইদহ", lat: 23.5448, lng: 89.1539 },
  magura: { name: "Magura", bnName: "মাগুরা", lat: 23.4873, lng: 89.4199 },
  narail: { name: "Narail", bnName: "নড়াইল", lat: 23.1725, lng: 89.5127 },
  gopalganj: { name: "Gopalganj", bnName: "গোপালগঞ্জ", lat: 23.0051, lng: 89.8266 },
  madaripur: { name: "Madaripur", bnName: "মাদারীপুর", lat: 23.1641, lng: 90.1897 },
  shariatpur: { name: "Shariatpur", bnName: "শরীয়তপুর", lat: 23.2423, lng: 90.4348 },
  rajbari: { name: "Rajbari", bnName: "রাজবাড়ী", lat: 23.7574, lng: 89.6445 },
  munshiganj: { name: "Munshiganj", bnName: "মুন্সীগঞ্জ", lat: 23.5422, lng: 90.5305 },
  manikganj: { name: "Manikganj", bnName: "মানিকগঞ্জ", lat: 23.8644, lng: 90.0047 },
  narsingdi: { name: "Narsingdi", bnName: "নরসিংদী", lat: 23.9197, lng: 90.7202 },
  sherpur: { name: "Sherpur", bnName: "শেরপুর", lat: 25.0205, lng: 90.0153 },
  pirojpur: { name: "Pirojpur", bnName: "পিরোজপুর", lat: 22.5841, lng: 89.972 },
  jhalokati: { name: "Jhalokati", bnName: "ঝালকাঠি", lat: 22.6406, lng: 90.1987 },
  barguna: { name: "Barguna", bnName: "বরগুনা", lat: 22.0953, lng: 90.077 },
  khagrachhari: { name: "Khagrachhari", bnName: "খাগড়াছড়ি", lat: 23.1193, lng: 91.9847 },
  rangamati: { name: "Rangamati", bnName: "রাঙ্গামাটি", lat: 22.6533, lng: 92.1753 },
  bandarban: { name: "Bandarban", bnName: "বান্দরবান", lat: 22.1953, lng: 92.2184 },
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180.0;
}

function toDeg(rad: number): number {
  return (rad * 180.0) / Math.PI;
}

function formatHoursToTime12(hours: number): string {
  let h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatHoursToTimeBn(hours: number): string {
  let h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  const period = h >= 12 ? "বিকাল/রাত" : "সকাল/দুপুর";
  h = h % 12;
  if (h === 0) h = 12;

  const toBnDigits = (num: number) => {
    const bn = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
    return num
      .toString()
      .split("")
      .map((d) => bn[parseInt(d, 10)] ?? d)
      .join("");
  };

  const hStr = toBnDigits(h);
  const mStr = m < 10 ? `০${toBnDigits(m)}` : toBnDigits(m);
  return `${hStr}:${mStr}`;
}

export class PrayerTimesService {
  calculatePrayerTimes(lat: number, lng: number, date: Date = new Date(), timezone: number = 6.0) {
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - startOfYear.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

    // Sun declination & Equation of Time (EoT)
    const B = (360 / 365) * (dayOfYear - 81);
    const eot =
      9.87 * Math.sin(toRad(2 * B)) -
      7.53 * Math.cos(toRad(B)) -
      1.5 * Math.sin(toRad(B)); // in minutes

    const declination = 23.45 * Math.sin(toRad((360 / 365) * (dayOfYear - 81))); // in degrees

    // Solar noon (Zawal / Dhuhr base)
    const solarNoon = 12 + timezone - lng / 15 - eot / 60;

    // Helper to calculate hour angle for a given zenith / altitude angle
    const calcHourAngle = (angleDeg: number): number => {
      const cosH =
        (Math.sin(toRad(angleDeg)) -
          Math.sin(toRad(lat)) * Math.sin(toRad(declination))) /
        (Math.cos(toRad(lat)) * Math.cos(toRad(declination)));
      if (cosH > 1 || cosH < -1) return 0;
      return toDeg(Math.acos(cosH)) / 15.0;
    };

    // Fajr (18 degrees twilight)
    const fajrHourAngle = calcHourAngle(-18.0);
    const fajr = solarNoon - fajrHourAngle;

    // Sunrise (-0.833 degrees refraction + solar radius)
    const sunriseHourAngle = calcHourAngle(-0.833);
    const sunrise = solarNoon - sunriseHourAngle;

    // Dhuhr (solar noon + 2 min buffer)
    const dhuhr = solarNoon + 2 / 60;

    // Asr (Hanafi shadow ratio = 2)
    const latRad = toRad(lat);
    const decRad = toRad(declination);
    const hanafiAltitude = toDeg(
      Math.atan(1 / (2 + Math.tan(Math.abs(latRad - decRad))))
    );
    const asrHourAngle = calcHourAngle(hanafiAltitude);
    const asr = solarNoon + asrHourAngle;

    // Maghrib / Sunset (-0.833 degrees)
    const maghrib = solarNoon + sunriseHourAngle;

    // Isha (18 degrees twilight)
    const isha = solarNoon + fajrHourAngle;

    // Sehri end (5-8 mins before Fajr)
    const sehriEnd = fajr - 8 / 60;
    const iftar = maghrib;

    // Determine current prayer & next prayer
    const currentHour = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;

    const prayerOrder = [
      { name: "Fajr", bnName: "ফজর", time: fajr, timeStr: formatHoursToTime12(fajr), timeBn: formatHoursToTimeBn(fajr) },
      { name: "Sunrise", bnName: "সূর্যোদয়", time: sunrise, timeStr: formatHoursToTime12(sunrise), timeBn: formatHoursToTimeBn(sunrise) },
      { name: "Dhuhr", bnName: "যোহর", time: dhuhr, timeStr: formatHoursToTime12(dhuhr), timeBn: formatHoursToTimeBn(dhuhr) },
      { name: "Asr", bnName: "আসর", time: asr, timeStr: formatHoursToTime12(asr), timeBn: formatHoursToTimeBn(asr) },
      { name: "Maghrib", bnName: "মাগরিব", time: maghrib, timeStr: formatHoursToTime12(maghrib), timeBn: formatHoursToTimeBn(maghrib) },
      { name: "Isha", bnName: "এশা", time: isha, timeStr: formatHoursToTime12(isha), timeBn: formatHoursToTimeBn(isha) },
    ];

    let currentPrayer = "Isha";
    let currentPrayerBn = "এশা";
    let nextPrayer = prayerOrder[0];
    let diffHours = prayerOrder[0].time + 24 - currentHour;

    for (let i = 0; i < prayerOrder.length; i++) {
      if (currentHour < prayerOrder[i].time) {
        nextPrayer = prayerOrder[i];
        diffHours = prayerOrder[i].time - currentHour;
        const prevIdx = (i - 1 + prayerOrder.length) % prayerOrder.length;
        currentPrayer = prayerOrder[prevIdx].name;
        currentPrayerBn = prayerOrder[prevIdx].bnName;
        break;
      }
    }

    const countdownSeconds = Math.max(0, Math.floor(diffHours * 3600));

    return {
      timings: {
        fajr: formatHoursToTime12(fajr),
        fajrBn: formatHoursToTimeBn(fajr),
        sunrise: formatHoursToTime12(sunrise),
        sunriseBn: formatHoursToTimeBn(sunrise),
        dhuhr: formatHoursToTime12(dhuhr),
        dhuhrBn: formatHoursToTimeBn(dhuhr),
        asr: formatHoursToTime12(asr),
        asrBn: formatHoursToTimeBn(asr),
        maghrib: formatHoursToTime12(maghrib),
        maghribBn: formatHoursToTimeBn(maghrib),
        isha: formatHoursToTime12(isha),
        ishaBn: formatHoursToTimeBn(isha),
        sehriEnd: formatHoursToTime12(sehriEnd),
        sehriEndBn: formatHoursToTimeBn(sehriEnd),
        iftar: formatHoursToTime12(iftar),
        iftarBn: formatHoursToTimeBn(iftar),
      },
      currentPrayer,
      currentPrayerBn,
      nextPrayer: nextPrayer.name,
      nextPrayerBn: nextPrayer.bnName,
      nextPrayerTime: nextPrayer.timeStr,
      countdownSeconds,
    };
  }

  getDistrictCoord(districtParam?: string): DistrictCoord {
    if (!districtParam) return BANGLADESH_DISTRICTS["dhaka"];
    const key = districtParam.toLowerCase().replace(/[^a-z]/g, "");
    return BANGLADESH_DISTRICTS[key] || BANGLADESH_DISTRICTS["dhaka"];
  }
}

export const prayerTimesService = new PrayerTimesService();
