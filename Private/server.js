const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config({ path: './process.env' })

const app = express();
app.use(cors());
app.use(express.json()); // Umožňuje přijímat JSON data v požadavcích
app.get("/*.js", (req, res, next) => {
    res.status(403).send("❌ Přístup zakázán");
  });
  

// Připojení k databázi
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

db.connect(err => {
    if (err) {
        console.error("Chyba při připojování k databázi:", err.message);
    } else {
        console.log("Připojeno k databázi!");
    }
});

// **API pro přidání rezervace**
app.post("/reserve", (req, res) => {
    const { teacher, day, time } = req.body;

    if (!teacher || !day || !time) {
        return res.status(400).json({ success: false, message: "Chybí požadované údaje!" });
    }

    const sql = "INSERT INTO reservations (teacher_name, day_name, time_slot) VALUES (?, ?, ?)";
    db.query(sql, [teacher, day, time], (err, result) => {
        if (err) {
            console.error("Chyba při ukládání do databáze:", err);
            return res.status(500).json({ success: false, message: "Chyba při ukládání do databáze!" });
        }
        res.json({ success: true, message: "Rezervace byla úspěšně vytvořena!" });
    });
});

// **Spuštění serveru**
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server běží na portu ${PORT}`);
});
