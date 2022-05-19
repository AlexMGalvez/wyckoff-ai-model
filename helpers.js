var fs = require("fs");
var papa = require("papaparse");
var XLSX = require("xlsx");

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

  while ((dirent = dir.readSync()) !== null) {
    if (dirent.name.slice(-4) == ".ods") {
      // only read .ods files
      filesData.push(readOdsFile(dirent.name));
    }
  }
  dir.closeSync();
  return filesData;
};

/*
  Requirements for the format of a csv file:
  -Data begins on the second row
  -Blank lines are automatically ignored
*/
const fileToObj = (fileName, accumulationStatus, fromDate, toDate) => {
  const csvFile = fs.readFileSync("./data/stock_csv_files/" + fileName, "utf8");
  const parsedFile = papa.parse(csvFile).data;
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

  // O(n) search of stock and market benchmark files can be optimized

  // read stock file
  let i = 0;
  while (typeof parsedFile[i] != "undefined" && parsedFile[i][0] != fromDate) {
    i++;
  }

  if (parsedFile[i] == "undefined") {
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

  while (typeof parsedFile[i] != "undefined" && parsedFile[i][0] != toDate) {
    date.push(parsedFile[i][0]);
    stockClosingPrice.push(parseFloat(parsedFile[i][4]));
    stockVolume.push(parseInt(parsedFile[i][6]));
    i++;
  }

  if (parsedFile[i] == "undefined") {
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

  date.push(parsedFile[i][0]);
  stockClosingPrice.push(parseFloat(parsedFile[i][4]));
  stockVolume.push(parseInt(parsedFile[i][6]));

  // read market benchmark file
  // no volume data before 1984-10-11
  let j = 0;
  while (
    typeof parsedBenchFile[j] != "undefined" &&
    parsedBenchFile[j][0] != fromDate
  ) {
    j++;
  }

  if (parsedBenchFile[j] == "undefined") {
    throw (
      "Error: The given fromDate '" +
      fromDate +
      "' from the " +
      fileName.slice(0, -3) +
      "ods" +
      " file does not occur in the market benchmark csv file"
    );
  }

  while (
    typeof parsedBenchFile[j] != "undefined" &&
    parsedBenchFile[j][0] != toDate
  ) {
    benchClosingPrice.push(parseFloat(parsedBenchFile[j][4]));
    benchVolume.push(parseInt(parsedBenchFile[j][6]));
    j++;
  }

  if (parsedBenchFile[j] == "undefined") {
    throw (
      "Error: The given toDate '" +
      toDate +
      "' from the " +
      fileName.slice(0, -3) +
      "ods" +
      " file does not occur in the market benchmark csv file"
    );
  }

  benchClosingPrice.push(parseFloat(parsedBenchFile[j][4]));
  benchVolume.push(parseInt(parsedBenchFile[j][6]));

  const content = {
    name: fileName.slice(0, -4),
    accumulationStatus,
    dates: date,
    f1: stockClosingPrice,
    f2: stockVolume,
    f3: benchClosingPrice,
    f4: benchVolume,
  };
  return content;
};

/*
  Ods files return a number as a date. This function converts the number to a date string formatted as yyyy-mm-dd.
*/
const getDateStr = (dateNum) => {
  const get2Digits = (num) => {
    if (num < 10) {
      return '0' + num;
    }
    return num;
  }
  const dateObj = XLSX.SSF.parse_date_code(Math.ceil(dateNum));
  const dateStr = dateObj.y.toString() + "-" + get2Digits(dateObj.m) + "-" + get2Digits(dateObj.d);
  return dateStr;
}

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
    if (
      (typeof data[i][0] != "undefined" && typeof data[i][1] != "undefined") ||
      (typeof data[i][2] != "undefined" && typeof data[i][3] != "undefined") ||
      (typeof data[i][0] != "undefined" &&
        typeof data[i][2] == "undefined" &&
        typeof data[i][3] == "undefined") ||
      (typeof data[i][1] != "undefined" &&
        typeof data[i][2] == "undefined" &&
        typeof data[i][3] == "undefined")
    ) {
      throw (
        "Error: " +
        csvFileName +
        " has a row thats incorrectly formatted. An accumulations row must have one 'from' date and one 'to' date."
      );
    }
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
      fileData.push(
        fileToObj(csvFileName, accumulationStatus, fromDate, toDate)
      );
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
      fileData.push(fileToObj(csvFileName, accumulationStatus, fromDate, toDate));
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
      fileData.push(fileToObj(csvFileName, accumulationStatus, fromDate, toDate));
    }
    i++;
  }
  return fileData;
};

module.exports = readFiles;
