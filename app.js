let express = require("express");
let app = express();
let fs = require("fs");
const PORT = "1235";
const helpers = require("./helpers.js");
const readFiles = helpers.readFiles;

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
