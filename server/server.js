const express = require("express");
require("dotenv").config();
const cors = require("cors");

const app = require("./app");

app.use(express.json());
app.use(cors());

app.use("/auth", require("./routes/auth"));

app.use("/readings", require("./routes/readings"));

app.use("/reports", require("./routes/reports"));

app.get("/", (req, res) => {
  res.send("Server is running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});