const express = require("express");
const pool = require("../config/db");
const auth = require("../middleware/auth");

const router = express.Router();
router.use(auth);

function pad(n) {
  return String(n).padStart(2, "0");
}

function todayString() {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
}

function isRealDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function getRange(type, dateStr) {
  const [year, month] = dateStr.split("-").map(Number);

  if (type === "daily") {
    return { from: dateStr, to: dateStr };
  }

  if (type === "mtd") {
    return { from: `${year}-${pad(month)}-01`, to: dateStr };
  }

  // monthly = the whole previous month
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const lastDay = new Date(Date.UTC(prevYear, prevMonth, 0)).getUTCDate();

  return {
    from: `${prevYear}-${pad(prevMonth)}-01`,
    to: `${prevYear}-${pad(prevMonth)}-${pad(lastDay)}`,
  };
}

router.get("/", async (req, res) => {
  try {
    const type = req.query.type || "daily";
    const date = req.query.date || todayString();

    if (!["daily", "mtd", "monthly"].includes(type)) {
      return res.status(400).json({ error: "Type must be daily, mtd or monthly." });
    }
    if (!isRealDate(date)) {
      return res.status(400).json({ error: "Please select a valid date." });
    }

    const { from, to } = getRange(type, date);

    const stats = await pool.query(
      `SELECT COUNT(*)::int AS count,
              MAX(value) AS highest,
              MIN(value) AS lowest,
              ROUND(AVG(value), 1) AS average
       FROM readings
       WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
      [req.user.id, from, to]
    );

    const row = stats.rows[0];
    const report = {
      type,
      from,
      to,
      count: row.count,
      highest: row.highest,
      lowest: row.lowest,
      average: row.average === null ? null : Number(row.average),
      empty: row.count === 0,
    };

    if (type === "daily") {
      const list = await pool.query(
        `SELECT id, slot, value
         FROM readings
         WHERE user_id = $1 AND reading_date = $2
         ORDER BY CASE slot
           WHEN 'morning' THEN 1
           WHEN 'after_breakfast' THEN 2
           WHEN 'after_lunch' THEN 3
           WHEN 'after_dinner' THEN 4
         END`,
        [req.user.id, date]
      );
      report.readings = list.rows;
    }

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

module.exports = router;