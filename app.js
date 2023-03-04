let express = require("express");
let app = express();
let fs = require("fs");

const PORT = "1235";
const dataProcessing = require("./static/data_processing.js");
const modelProcessing = require("./static/model.js");
const dataHelpers = require("./static/data_helpers.js");
const readFiles = dataProcessing.readFiles;
const modelMain = modelProcessing.modelMain;
const makePredictions = modelProcessing.makePredictions;
const dataReducer = dataHelpers.dataReducer;
const shuffle = dataHelpers.shuffle;
const groupBy = dataHelpers.groupBy;
const testingAcc = dataHelpers.testingAcc;

app.set("view engine", "ejs");
app.use("/static", express.static("./static/"));

app.get("/", async function (req, res) {
  let data = readFiles();
  data = dataReducer(data, 20, 400);
  // data.forEach(e => console.log(e.dates.length))
  shuffle(data);
  const trainingData = data.slice(0, -10);
  //const trainingData = data;
  const testingData = data.slice(-10); // data used for testing how well the model trained
  const padMax = Math.max(...data.map((el) => el.dates.length));
  console.log("Training data size: ", trainingData.length);
  console.log("Testing data size: ", testingData.length);
  console.log("Total data size: ", data.length);
  const groupByAccumulationStatus = groupBy(data, "accumulationStatus");
  console.log("Number of data distributions: ", groupByAccumulationStatus["0"].length);
  console.log("Number of data accumulations: ", groupByAccumulationStatus["1"].length + groupByAccumulationStatus["2"].length);
  console.log("Pad max: ", padMax);

  // Create and train model
  // ----------------------
  const [model, history] = await modelMain(trainingData, padMax);

  // Test how effective the model is
  // -------------------------------
  const [expectedResults, modelOut] = makePredictions(testingData, model, padMax);
  // console.log("Testing data: ");
  // console.log(testingData);
  console.log("Expected results: ");
  console.log(expectedResults);
  console.log("Testing results: ");
  console.log(modelOut.arraySync());
  console.log("Testing accuracy: ", testingAcc(modelOut.arraySync(), expectedResults));

  //res.render("home", { data });
  res.render("home", { history });

  // Save model 
  // ----------
  //saveModel(model);
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT, "\n");
});