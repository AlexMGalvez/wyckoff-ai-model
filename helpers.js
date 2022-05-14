// import * as fs from "fs";
// import papa from "papaparse";
var fs = require("fs");
var papa = require("papaparse");

/*
  Requirements for the format of a csv file:
  -Data begins on the second row
  -Blank lines are automatically disregarded
*/
const fileToObj = (file, name, accumulation) => {
  const csvFile = fs.readFileSync(file, "utf8");
  const parsedFile = papa.parse(csvFile).data;
  let date = [];
  let closingPrice = [];
  let volume = [];
  for (let i = 1; i < parsedFile.length; i++) {
    if (parsedFile[i].length != 1) {
      date.push(parsedFile[i][0]);
      closingPrice.push(parseFloat(parsedFile[i][4]));
      volume.push(parseInt(parsedFile[i][6]));
    }
  }

  const content = { name, accumulation, x: date, y: closingPrice, z: volume };

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
*/
const readFiles = () => {
  let accumulation = 0; // 0 marks a false accumulation pattern
  let fileData = [
    ...iterateAccumFolder("./data/accumulations/from_first_sc/"),
    ...iterateAccumFolder("./data/accumulations/from_lowest_sc(DEFAULT)/"),
    ...iterateLowFolder("./data/false_accumulations/", accumulation),
  ];
  return fileData;
};

module.exports = readFiles;
