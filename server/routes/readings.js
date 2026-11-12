const express=require("express");
const pool=require("../config/db");
const auth=require("../middleware/auth");

const router = express.Router();
router.use(auth);

const SLOTS={
    morning:"a Morning",
    after_breakfast:"an After breakfast",
    after_lunch:"an After lunch",
    after_dinner:"an After dinner",
};

function todayString() {
  return new Date().toLocaleDateString("en-CA"); // gives YYYY-MM-DD
}

function validateReading({ reading_date, slot, value }) {
  if (value === undefined || value === null || value === "") {
    return "Please enter a glucose value.";
  }
  const num = Number(value);
  if (!Number.isInteger(num) || num < 40 || num > 600) {
    return "Value must be between 40 and 600 mg/dl.";
  }
  if (!slot || !SLOTS[slot]) {
    return "Please select a time slot.";
  }
  if (!reading_date || !/^\d{4}-\d{2}-\d{2}$/.test(reading_date)) {
    return "Please select a date.";
  }
  if (reading_date > todayString()) {
    return "Date cannot be in the future.";
  }
  return null;
}

router.post("/", async (req, res) => {
  try {
    const { reading_date, slot, value } = req.body || {};

    const validationError = validateReading({ reading_date, slot, value });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM readings WHERE user_id = $1 AND reading_date = $2",
      [req.user.id, reading_date]
    );
    if (Number(countResult.rows[0].count) >= 4) {
      return res.status(400).json({ error: "You can add only 4 readings per day." });
    }

    const duplicate = await pool.query(
      "SELECT id FROM readings WHERE user_id = $1 AND reading_date = $2 AND slot = $3",
      [req.user.id, reading_date, slot]
    );
    if (duplicate.rows.length > 0) {
      return res
        .status(409)
        .json({ error: `You already have ${SLOTS[slot]} reading for this date.` });
    }

    const result = await pool.query(
      `INSERT INTO readings (user_id, reading_date, slot, value)
       VALUES ($1, $2, $3, $4)
       RETURNING id, to_char(reading_date, 'YYYY-MM-DD') AS reading_date, slot, value`,
      [req.user.id, reading_date, slot, Number(value)]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.get("/", async (req, res) => {
  try {
    const { date } = req.query;
    const params = [req.user.id];
    let where = "WHERE user_id = $1";

    if (date) {
      params.push(date);
      where += " AND reading_date = $2";
    }

    const result = await pool.query(
      `SELECT id, to_char(reading_date, 'YYYY-MM-DD') AS reading_date, slot, value
       FROM readings
       ${where}
       ORDER BY readings.reading_date DESC,
         CASE slot
           WHEN 'morning' THEN 1
           WHEN 'after_breakfast' THEN 2
           WHEN 'after_lunch' THEN 3
           WHEN 'after_dinner' THEN 4
         END`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid reading id." });
    }

    const { reading_date, slot, value } = req.body || {};

    const validationError = validateReading({ reading_date, slot, value });
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existing = await pool.query(
      "SELECT id FROM readings WHERE id = $1 AND user_id = $2",
      [id, req.user.id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Reading not found." });
    }

    const countResult = await pool.query(
      "SELECT COUNT(*) FROM readings WHERE user_id = $1 AND reading_date = $2 AND id <> $3",
      [req.user.id, reading_date, id]
    );
    if (Number(countResult.rows[0].count) >= 4) {
      return res.status(400).json({ error: "You can add only 4 readings per day." });
    }

    const duplicate = await pool.query(
      "SELECT id FROM readings WHERE user_id = $1 AND reading_date = $2 AND slot = $3 AND id <> $4",
      [req.user.id, reading_date, slot, id]
    );
    if (duplicate.rows.length > 0) {
      return res
        .status(409)
        .json({ error: `You already have ${SLOTS[slot]} reading for this date.` });
    }

    const result = await pool.query(
      `UPDATE readings SET reading_date = $1, slot = $2, value = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, to_char(reading_date, 'YYYY-MM-DD') AS reading_date, slot, value`,
      [reading_date, slot, Number(value), id, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid reading id." });
    }

    const result = await pool.query(
      "DELETE FROM readings WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reading not found." });
    }

    res.json({ message: "Reading deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
});
module.exports = router;
