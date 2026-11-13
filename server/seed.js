require("dotenv").config();
const bcrypt = require("bcrypt");
const pool = require("./config/db");

const DEMO = { name: "Demo User", email: "demo@sweety.com", password: "Demo@123" };
const SLOTS = ["morning", "after_breakfast", "after_lunch", "after_dinner"];
const DAYS = 60;

function dateOffset(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-CA"); 
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  try {
    await pool.query("DELETE FROM users WHERE email = $1", [DEMO.email]);

    const hash = await bcrypt.hash(DEMO.password, 10);
    const userResult = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [DEMO.name, DEMO.email, hash]
    );
    const userId = userResult.rows[0].id;

    let count = 0;
    for (let i = 0; i < DAYS; i++) {
      if (i % 9 === 8) continue; // leave a few days empty, like real life

      const date = dateOffset(i);
      for (const slot of SLOTS) {
        const isMorning = slot === "morning";
        if (!isMorning && Math.random() < 0.4) continue; // not every slot every day

        const value = isMorning ? randomBetween(85, 130) : randomBetween(110, 190);
        await pool.query(
          "INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)",
          [userId, date, slot, value]
        );
        count++;
      }
    }

    console.log(`Seed done. Demo login: ${DEMO.email} / ${DEMO.password}`);
    console.log(`Created ${count} readings over the last ${DAYS} days.`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();