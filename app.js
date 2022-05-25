let express = require("express");
let app = express();
let fs = require("fs");
const PORT = "1235";
const dataHelpers = require("./data_helpers.js");
const readFiles = dataHelpers.readFiles;

app.set("view engine", "ejs");
app.use("/static", express.static('./static/'));

app.get("/", function (req, res) {
  let data = readFiles();
  res.render("home", { data });
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT, "\n");
});
