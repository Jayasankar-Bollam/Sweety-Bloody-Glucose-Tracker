const express = require("express");
require("dotenv").config();
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.use("/auth", require("./routes/auth"));
app.use("/readings", require("./routes/readings"));
app.use("/reports", require("./routes/reports"));

app.get("/", (req, res) => {
  res.send("Server is running");
});

module.exports = app;