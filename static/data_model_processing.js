/**
 * ------------------------
 * data_model_processing.js
 * ------------------------
 * These functions are responsible for processing javascript stock data into data that tensorflow can easily use
 */

const ss = require("simple-statistics");

const PLOTDATASIZE = 5;
const PERCENTILE = 0.05;

let plotData = {
    stock: { rawPlotData: [], diffPlotData: [], normPlotData: [] },
    volume: { rawPlotData: [], diffPlotData: [], normPlotData: [] }
};

/*
   Makes an array of data stationary through differencing. Note that the output length = data.length - 1
*/
const dataDifferencing = (data) => {
    let dataDiff = [];
    for (let x = 1; x < data.length; x++) {
        let yDiff = data[x] - data[x - 1];
        dataDiff.push(yDiff);
    }
    return dataDiff;
}

/*
   Makes an array of data normalized with linear scaling equation x' = (x - xmin) / (xmax - xmin) for prices and volumes seperately
*/
const dataNormalization = (data) => {
    let dataNorm = [];
    let xmin = Math.min(...data);
    let xmax = Math.max(...data);
    let xNorm;
    for (let i = 0; i < data.length; i++) {
        xNorm = (data[i] - xmin) / (xmax - xmin);
        dataNorm.push(xNorm);
    }
    return dataNorm;
}

/*
   Winsorize an array by replacing outliers beyone the percentile with min and max values
*/
const winsorizeArray = (someArray) => {
    let low = ss.quantile(someArray, PERCENTILE);
    let high = ss.quantile(someArray, 1 - PERCENTILE);
    let winsorizedArray = [];

    someArray.forEach(element => {
        if (element < low) {
            winsorizedArray.push(low);
        }
        else if (element > high) {
            winsorizedArray.push(high);
        } else {
            winsorizedArray.push(element);
        }
    });

    return winsorizedArray;
}

/*
  Reformats raw data into X and Y arrays for feeding into the neural network and provides a padding index array.
  Receives:
    data is an array of stock pattern objects.
    data = [{name: string, accumulationStatus: int, dates: [...], f1: [...], f2: [...], f3: [...], f4: [...]}, ...]

  Returns:
    X is defined as an input array of stock pattern arrays. Each stock pattern array contains 4 feature arrays of padMax length.
    X = [[feature1 array, feature2 array, feature3 array, feature4 array], ...]

    Y is defined as an output array containing one hot encoded arrays representing the output of each stock. Ex: [0, 1, 0]
    Y = [[num, num, num], ...]

    paddingArray is an array of numbers representing the indexes of each stock where padding begins.
*/
const reformatRawData = (data, specialChar, inputLayerShape, toPlot) => {
    let X = [];
    let Y = [];
    let paddingArray = [];
    let feature1Wins;
    let feature1Diff;
    let feature1Norm;
    let feature2Wins;
    let feature2Diff;
    let feature2Norm;

    for (let i = 0; i < data.length; i++) {
        // winsorize feature array for outliers, then difference, then normalize
        feature1Wins = winsorizeArray([...data[i].f1]);
        feature1Diff = dataDifferencing(feature1Wins);
        feature1Norm = dataNormalization(feature1Diff);

        feature2Wins = winsorizeArray([...data[i].f2]);
        feature2Diff = dataDifferencing(feature2Wins);
        feature2Norm = dataNormalization(feature2Diff);

        // Collect sample data for plotting
        if (toPlot && i < PLOTDATASIZE) {
            plotData.stock.rawPlotData.push(feature1Wins);
            plotData.stock.diffPlotData.push(feature1Diff);
            plotData.stock.normPlotData.push(feature1Norm);

            plotData.volume.rawPlotData.push(feature2Wins);
            plotData.volume.diffPlotData.push(feature2Diff);
            plotData.volume.normPlotData.push(feature2Norm);
        }

        X.push([
            // [...data[i].f1], // Without differencing
            // [...data[i].f2],
            feature1Norm,
            feature2Norm,
        ]);
        paddingArray.push(X[i][0].length);
        // provide padding for short length arrays
        for (let j = X[i][0].length; j < inputLayerShape[1]; j++) {
            X[i][0].push(specialChar);
            X[i][1].push(specialChar);
        }
        // Y data doesnt get differenced or normalized because it is normalized by default

        // Three classification types
        // --------------------------
        // -this option has been temporairly deactivated and replaced with 2 classification types due to the model's severe inability to learn
        // Y.push(
        //   data[i].accumulationStatus == 0 // false accumulation pattern
        //     ? [1, 0, 0]
        //     : data[i].accumulationStatus == 1 // accumulation pattern ending at a spring in phase C
        //     ? [0, 1, 0]
        //     : [0, 0, 1] // incomplete accumulation pattern ending at a secondary test in phase B
        // );

        // Two classification types
        // ------------------------
        // -if accumulation status is 0, consider pattern as distribution. If 1 or 2, consider as accumulation
        Y.push(
            data[i].accumulationStatus == 0
                ? [1, 0] // false accumulation pattern
                : [0, 1] // accumulation pattern ending at a spring in phase C or in progress
        );
    }
    return [X, Y, paddingArray];
};

module.exports = {
    reformatRawData,
    plotData
};