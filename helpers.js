const ERROR_TYPES = [
  "row formating",
  "date comparison",
  "fromDate file matching",
  "toDate file matching",
];
let fs = require("fs");
let papa = require("papaparse");
let XLSX = require("xlsx");

/*
  Maps all the stock pattern .ods files content with the historic stock .csv files data and converts it into an array of data objects

  Returns an array of stock pattern objects with properties:
    -name (str)
    -accumulationStatus (int)
    -dates (array of strs)
    -feature 1: closing prices (array of floats)
    -feature 2: volumes (array of ints)
    -feature 3: benchmark closing prices (array of floats)
    -feature 4: benchmark volumes (array of ints)

    filesData = [{name, accumulationStatus, dates: [...], f1: [...], f2: [...], f3: [...], f4: [...]}, ...];
*/
const readFiles = () => {
  let dir = fs.opendirSync("./data/stock_ods_files");
  let dirent;
  let filesData = [];

  console.log("Gathering data...");
  while ((dirent = dir.readSync()) !== null) {
    if (dirent.name.slice(-4) == ".ods") {
      // only read .ods files
      filesData.push(...readOdsFile(dirent.name));
    }
  }
  console.log("Data gathering complete.");
  console.log("");

  dir.closeSync();
  return filesData;
};

/*
  Requirements for the format of a csv file:
  -Data begins on the second row
  -Blank lines are automatically ignored

  Receives file data of a stock's patterns and converts it to an array of stock pattern objects. This function is called for every stock .csv file
*/
const fileToObjs = (fileName, fileData) => {
  const csvFile = fs.readFileSync("./data/stock_csv_files/" + fileName, "utf8");
  const parsedStockFile = papa.parse(csvFile).data;
  const csvBenchFile = fs.readFileSync(
    "./data/market_benchmark/^IXIC1971-02-05.csv",
    "utf8"
  );
  const parsedBenchFile = papa.parse(csvBenchFile).data;
  let date = [];
  let stockClosingPrice = [];
  let stockVolume = [];
  let benchClosingPrice = [];
  let benchVolume = [];
  let fileContent = [];

  let i1, j1, i2, j2, stockContent;
  i1 = 0;
  i2 = 0;

  for (let k in fileData) {
    // STOCK FILE
    while (
      typeof parsedStockFile[i1] != "undefined" &&
      parsedStockFile[i1][0] != fileData[k].fromDate
    ) {
      i1++;
    }

    // checks if fromDate was not found in file
    errorHandling("fromDate file matching", fileName, [
      parsedStockFile[i1],
      fileData[k].fromDate,
    ]);

    // fromDate found in file
    j1 = i1;
    while (
      typeof parsedStockFile[j1] != "undefined" &&
      parsedStockFile[j1][0] != fileData[k].toDate
    ) {
      date.push(parsedStockFile[j1][0]);
      stockClosingPrice.push(parseFloat(parsedStockFile[j1][4]));
      stockVolume.push(parseInt(parsedStockFile[j1][6]));
      j1++;
    }

    // checks if toDate was not found in file
    errorHandling("toDate file matching", fileName, [
      parsedStockFile[j1],
      fileData[k].toDate,
    ]);

    // else adds the last line from the file
    date.push(parsedStockFile[j1][0]);
    stockClosingPrice.push(parseFloat(parsedStockFile[j1][4]));
    stockVolume.push(parseInt(parsedStockFile[j1][6]));

    // BENCHMARK FILE
    while (
      typeof parsedBenchFile[i2] != "undefined" &&
      parsedBenchFile[i2][0] != fileData[k].fromDate
    ) {
      i2++;
    }

    // checks if fromDate was not found in file
    errorHandling("fromDate file matching", "the market benchmark csv file", [
      parsedBenchFile[i2],
      fileData[k].fromDate,
    ]);

    // fromDate found in file
    j2 = i2;
    while (
      typeof parsedBenchFile[j2] != "undefined" &&
      parsedBenchFile[j2][0] != fileData[k].toDate
    ) {
      benchClosingPrice.push(parseFloat(parsedBenchFile[j2][4]));
      benchVolume.push(parseInt(parsedBenchFile[j2][6]));
      j2++;
    }

    // checks if toDate was not found in file
    errorHandling("toDate file matching", "the market benchmark csv file", [
      parsedBenchFile[j2],
      fileData[k].toDate,
    ]);

    // else adds the last line from the file
    benchClosingPrice.push(parseFloat(parsedBenchFile[j2][4]));
    benchVolume.push(parseInt(parsedBenchFile[j2][6]));

    stockContent = {
      name: fileName.slice(0, -4),
      accumulationStatus: fileData[k].accumulationStatus,
      dates: date,
      f1: stockClosingPrice,
      f2: stockVolume,
      f3: benchClosingPrice,
      f4: benchVolume,
    };
    fileContent.push(stockContent);
    date = [];
    stockClosingPrice = [];
    stockVolume = [];
    benchClosingPrice = [];
    benchVolume = [];
  }

  return fileContent;
};

/*
  Ods files return a number as a date. This function converts the number to a date string formatted as yyyy-mm-dd.
*/
const getDateStr = (dateNum) => {
  const get2Digits = (num) => {
    if (num < 10) {
      return "0" + num;
    }
    return num;
  };
  const dateObj = XLSX.SSF.parse_date_code(Math.ceil(dateNum));
  const dateStr =
    dateObj.y.toString() +
    "-" +
    get2Digits(dateObj.m) +
    "-" +
    get2Digits(dateObj.d);
  return dateStr;
};

const readOdsFile = (filename) => {
  const workbook = XLSX.readFile("./data/stock_ods_files/" + filename);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  let fromDate, toDate, accumulationStatus;
  let csvFileName = filename.slice(0, -3) + "csv";
  let fileData = [];

  let i = 0;
  while (data[i][0] != "ACCUMULATIONS") {
    i++;
  }
  i = i + 3;
  while (data[i][0] != "END") {
    errorHandling("row formating", csvFileName, data[i]);

    if (typeof data[i][0] != "undefined") {
      // from lowest sc (default)
      fromDate = getDateStr(data[i][0]);
      if (typeof data[i][2] != "undefined") {
        // to low of spring (default)
        toDate = getDateStr(data[i][2]);
        accumulationStatus = 1;
      } else if (typeof data[i][3] != "undefined") {
        // to an st
        toDate = getDateStr(data[i][3]);
        accumulationStatus = 2;
      }
      errorHandling("date comparison", csvFileName, [toDate, fromDate]);
      fileData.push({ accumulationStatus, fromDate, toDate });
    } else if (typeof data[i][1] != "undefined") {
      // from first but lower sc
      fromDate = getDateStr(data[i][1]);
      if (typeof data[i][2] != "undefined") {
        // to low of spring (default)
        toDate = getDateStr(data[i][2]);
        accumulationStatus = 1;
      } else if (typeof data[i][3] != "undefined") {
        // to an st
        toDate = getDateStr(data[i][3]);
        accumulationStatus = 2;
      }
      errorHandling("date comparison", csvFileName, [toDate, fromDate]);
      fileData.push({ accumulationStatus, fromDate, toDate });
    }
    i++;
  }
  while (data[i][0] != "FALSE ACCUMULATIONS") {
    i++;
  }
  i = i + 2;
  while (data[i][0] != "END") {
    if (typeof data[i][0] != "undefined" && typeof data[i][1] != "undefined") {
      fromDate = getDateStr(data[i][0]);
      toDate = getDateStr(data[i][1]);
      accumulationStatus = 0;
      errorHandling("date comparison", csvFileName, [toDate, fromDate]);
      fileData.push({ accumulationStatus, fromDate, toDate });
    }
    i++;
  }

  fileData.sort((a, b) => {
    if (a.fromDate === b.fromDate) {
      return a.toDate > b.toDate ? 1 : -1;
    }
    return a.fromDate > b.fromDate ? 1 : -1;
  });

  // iterate through sorted file data array, map values with .ods files and convert to stock objects array
  //let fileStocks = [];

  return fileToObjs(csvFileName, fileData);
};

const errorHandling = (errorType, fileName, content) => {
  if (errorType == ERROR_TYPES[0]) {
    let cell = content;
    if (
      (typeof cell[0] != "undefined" && typeof cell[1] != "undefined") ||
      (typeof cell[2] != "undefined" && typeof cell[3] != "undefined") ||
      (typeof cell[0] != "undefined" &&
        typeof cell[2] == "undefined" &&
        typeof cell[3] == "undefined") ||
      (typeof cell[1] != "undefined" &&
        typeof cell[2] == "undefined" &&
        typeof cell[3] == "undefined")
    ) {
      throw (
        "Error: " +
        fileName +
        " has a row thats incorrectly formatted. An accumulations row must have one 'from' date and one 'to' date."
      );
    }
  } else if (errorType == ERROR_TYPES[1]) {
    // throw error if fromDate occurs after toDate
    [toDate, fromDate] = content;
    if (toDate < fromDate) {
      throw (
        "Error: The given fromDate '" +
        fromDate +
        "' from the " +
        fileName.slice(0, -3) +
        "ods" +
        " file occurs later than the given toDate '" +
        toDate +
        "'"
      );
    }
  } else if (errorType == ERROR_TYPES[2]) {
    [fileLine, fromDate] = content;
    if (typeof fileLine == "undefined") {
      throw (
        "Error: The given fromDate '" +
        fromDate +
        "' from the " +
        fileName.slice(0, -3) +
        "ods" +
        " file does not occur in " +
        fileName
      );
    }
  } else if (errorType == ERROR_TYPES[3]) {
    [fileLine, toDate] = content;
    if (typeof fileLine == "undefined") {
      throw (
        "Error: The given toDate '" +
        toDate +
        "' from the " +
        fileName.slice(0, -3) +
        "ods" +
        " file does not occur in " +
        fileName
      );
    }
  }
};

module.exports = {
  readFiles,
};
