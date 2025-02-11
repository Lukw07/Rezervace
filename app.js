const baka = require("./baka.js");
const fs = require("fs");
const db = require("./server.js");
const dotenv = require("dotenv");  // Přesunutí deklarace dotenv na začátek
dotenv.config({ path: './process.env' }) // nebo dotenv.config({ path: './process.env' }) pokud používáš vlastní soubor

// Funkce pro načtení a uložení rozvrhu
async function updateTimetables() {
  try {
    console.log("Spojeno s databází!"); 
    console.log("Spouštím aktualizaci rozvrhů...");

    // Použití environmentálních proměnných
    const bakaAuth = await baka.login(process.env.BAKA_USER, process.env.BAKA_PASSWORD);
    const timetables = await baka.loadAllTeachers(bakaAuth);

    fs.writeFile("output.json", JSON.stringify(timetables), (err) => {
      if (err) {
        console.error("Chyba při zápisu do souboru:", err);
      } else {
        console.log("Rozvrh byl úspěšně uložen do 'output.json'.");
      }
    });
  } catch (error) {
    console.error("Chyba při aktualizaci rozvrhu:", error.message);
  }
}

// Funkce pro odpočet v konzoli
function startCountdown(intervalMinutes) {
  let remainingSeconds = intervalMinutes * 60;

  const countdown = setInterval(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    process.stdout.write(`\rDalší aktualizace za: ${minutes} min ${seconds} s `);

    remainingSeconds -= 1;

    if (remainingSeconds < 0) {
      clearInterval(countdown); // Zastavení odpočtu
      console.log("\nSpouštím další aktualizaci...");
      updateTimetables(); // Spuštění aktualizace
      startCountdown(intervalMinutes); // Znovu zahájení odpočtu
    }
  }, 1000);
}

// Spuštění první aktualizace a odpočtu
(async () => {
  await updateTimetables();
  startCountdown(15); // Nastavení odpočtu na 15 minut
})();