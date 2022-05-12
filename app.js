let readFiles = require("./helpers.js");
let express = require("express");
let app = express();
let fs = require("fs");
const PORT = "1235";

app.set("view engine", "ejs");
app.use("/static", express.static('./static/'));

app.get("/", function (req, res) {
  let accumulations = readFiles("./data/accumulations");
  let false_accumulations = readFiles("./data/false_accumulations");
  let data = [...accumulations, ...false_accumulations];
  res.render("home", { data });
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
