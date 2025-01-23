const mysql = require("mysql2");
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: './process.env' });

// Create a connection to the database
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
});

// Test the connection
db.connect((err) => {
  if (err) {
    console.error("Chyba při připojování k databázi:", err.message);
  } else {
    console.log("Připojeno k databázi!");
  }
});

module.exports = db; // Export the db object
