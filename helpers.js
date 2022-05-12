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

const readFiles = (path) => {
  const dir = fs.opendirSync(path);
  let dirent;
  let fileData = [];
  while ((dirent = dir.readSync()) !== null) {
    // 0 is false accumulation, 1 is true accumulation
    let accumulation = 1;
    if (path == "./data/false_accumulations") {
      accumulation = 0;
    }
    fileData.push(fileToObj(path + "/" + dirent.name, dirent.name.slice(0, -4), accumulation));
  }
  dir.closeSync();
  return fileData;
};

module.exports = readFiles;