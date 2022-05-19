let readFiles = require("./helpers.js");
let express = require("express");
let app = express();
let fs = require("fs");
const PORT = "1245";

app.set("view engine", "ejs");
app.use("/static", express.static('./static/'));

app.get("/", function (req, res) {
  let data = readFiles();
  res.render("home", { data });
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
