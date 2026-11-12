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

module.exports = router;
