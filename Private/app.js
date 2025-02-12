const baka = require("./baka.js");
const fs = require("fs");
const db = require("./server.js");
const dotenv = require("dotenv");

dotenv.config({ path: './process.env' });

// Ověření, že proměnné prostředí jsou nastavené
if (!process.env.BAKA_USER || !process.env.BAKA_PASSWORD) {
  console.error("❌ Chyba: Chybí přihlašovací údaje v .env souboru!");
  process.exit(1);
}

// Funkce pro načtení a uložení rozvrhu
async function updateTimetables() {
  try {
    console.log("✅ Spojeno s databází!");
    console.log("🔄 Spouštím aktualizaci rozvrhů...");

    const bakaAuth = await baka.login(process.env.BAKA_USER, process.env.BAKA_PASSWORD);
    const timetables = await baka.loadAllTeachers(bakaAuth);

    // Bezpečný zápis do souboru
    fs.writeFileSync("output.json", JSON.stringify(timetables, null, 2), { mode: 0o600 });

    console.log("✅ Rozvrh byl úspěšně uložen do 'output.json'.");
  } catch (error) {
    console.error("❌ Chyba při aktualizaci rozvrhu:", error.message);
  }
}

// Funkce pro odpočet v konzoli
function startCountdown(intervalMinutes) {
  let remainingSeconds = intervalMinutes * 60;

  const countdown = setInterval(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    process.stdout.write(`\r⏳ Další aktualizace za: ${minutes} min ${seconds} s `);

    remainingSeconds -= 1;

    if (remainingSeconds < 0) {
      clearInterval(countdown);
      console.log("\n🚀 Spouštím další aktualizaci...");
      updateTimetables();
      startCountdown(intervalMinutes);
    }
  }, 1000);
}

// Spuštění první aktualizace a odpočtu
(async () => {
  if (require.main === module) {  // Ověří, že skript není importován někde jinde
    await updateTimetables();
    startCountdown(15);
  }
})();