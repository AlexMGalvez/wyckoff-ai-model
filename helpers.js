// import * as fs from "fs";
// import papa from "papaparse";
var fs = require("fs");
var papa = require("papaparse");

/*
  Requirements for the format of a csv file:
  -Data begins on the second row
  -Blank lines are automatically disregarded
*/
const fileToObj = (file, name, accumulationStatus) => {
  const csvFile = fs.readFileSync(file, "utf8");
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

  // read stock pattern file
  for (let i = 1; i < parsedFile.length; i++) {
    if (parsedFile[i].length != 1) {
      date.push(parsedFile[i][0]);
      stockClosingPrice.push(parseFloat(parsedFile[i][4]));
      stockVolume.push(parseInt(parsedFile[i][6]));
    }
  }

  // O(n) search for starting date can be optimized
  let j = 0;
  while (parsedBenchFile[j][0] != date[0]) {
    j++;
  }

  // read market benchmark file
  while (parsedBenchFile[j][0] != date.at(-1)) {
    benchClosingPrice.push(parseFloat(parsedBenchFile[j][4]));
    // no volume data before 1984-10-11
    benchVolume.push(parseInt(parsedBenchFile[j][6]));
    j++;
  }
  benchClosingPrice.push(parseFloat(parsedBenchFile[j][4]));
  benchVolume.push(parseInt(parsedBenchFile[j][6]));

  const content = {
    name,
    accumulationStatus,
    dates: date,
    f1: stockClosingPrice,
    f2: stockVolume,
    f3: benchClosingPrice,
    f4: benchVolume,
  };

  // // write stock object to file
  // fs.writeFile("test.txt", JSON.stringify(content), (err) => {
  //   if (err) {
  //     console.error(err);
  //     return;
  //   }
  // });

  return content;
};

/*
  Used for converting a low level folder with csv data into an array of data objects
*/
const iterateLowFolder = (path, accumulation) => {
  let dir1 = fs.opendirSync(path);
  let dirent1;
  let fileData = [];

  while ((dirent1 = dir1.readSync()) !== null) {
    fileData.push(
      fileToObj(path + dirent1.name, dirent1.name.slice(0, -4), accumulation)
    );
  }
  dir1.closeSync();
  return fileData;
};

/*
  Used for iterating through the nested folders in the higher level /accumulations folder, and converting their contents into an array of data objects with their respective accumulation values
*/
const iterateAccumFolder = (path) => {
  let dir1 = fs.opendirSync(path);
  let dirent1;
  let fileData = [];
  let accumulation;

  while ((dirent1 = dir1.readSync()) !== null) {
    if (dirent1.name == "to_lps") {
      accumulation = 2; // 2 marks a true accumulation pattern ending at a last point of support in phase D
      fileData.push(
        ...iterateLowFolder(path + dirent1.name + "/", accumulation)
      );
    } else if (dirent1.name == "to_phaseB_st") {
      accumulation = 3; // 3 marks a true accumulation pattern ending at a secondary test in phase B
      fileData.push(
        ...iterateLowFolder(path + dirent1.name + "/", accumulation)
      );
    } else if (dirent1.name == "to_spring(DEFAULT)") {
      accumulation = 1; // 1 marks a true accumulation pattern ending at a spring in phase C
      fileData.push(
        ...iterateLowFolder(path + dirent1.name + "/", accumulation)
      );
    }
  }
  dir1.closeSync();
  return fileData;
};

/*
  Converts all the csv data from the /data folder into an array of data objects

  returns an array of stock pattern objects with properties:
    -name (str)
    -accumulationStatus (int)
    -dates (array of strs)
    -feature 1: closing prices (array of floats)
    -feature 2: volumes (array of ints)
    -feature 3: benchmark closing prices (array of floats)
    -feature 4: benchmark volumes (array of ints)

    fileData = [{name, accumulationStatus, dates: [...], f1: [...], f2: [...], f3: [...], f4: [...]}, ...];
*/
const readFiles = () => {
  let accumulationStatus = 0; // 0 marks a false accumulation pattern
  let fileData = [
    ...iterateAccumFolder("./data/accumulations/from_first_sc/"),
    ...iterateAccumFolder("./data/accumulations/from_lowest_sc(DEFAULT)/"),
    ...iterateLowFolder("./data/false_accumulations/", accumulationStatus),
  ];
  return fileData;
};

module.exports = readFiles;
