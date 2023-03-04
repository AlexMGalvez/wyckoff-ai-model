const tf = require('@tensorflow/tfjs-node');
//let R = require("r-script");
//R.import("tseries");
//import R from 'r-script';

const specialChar = 0;
const inputLayerNeurons = 64;
let inputLayerShape = [2]; //4
const rnnOutputNeurons = 16;
const rnnInputShape = [16, 4];
const outputLayerNeurons = 1;
const outputLayerShape = 16;
const nLayers = 4;
const learningRate = 0.04556645082430197;
const batchSize = 32;
const nEpochs = 5; //50
const rnn_input_layer_features = 2; //4
const rnn_input_layer_timesteps = inputLayerNeurons / rnn_input_layer_features;
const rnn_input_shape = [rnn_input_layer_features, rnn_input_layer_timesteps];

const modelMain = async (data, padMax) => {
  inputLayerShape.push(padMax);
  const [X, Y, paddingArray] = reformatRawData(
    data,
    specialChar,
    inputLayerShape
  );


  const inputTensor = tf.tensor3d(X);
  const xs = normalizeTensorFit(inputTensor, paddingArray, inputLayerShape[1]);
  const ys = tf.tensor2d(Y); // labelTensor (ys) is already normalized
  inputTensor.dispose();
  //const [model, history] = await trialTraining(xs, ys);

  // troubleshooting
  //xs.print(true);
  //ys.print(true);
  const [model, history] = await optimizedTraining(xs, ys);
  xs.dispose();
  ys.dispose();

  return [model, history];
};

const optimizedTraining = async (xs, ys) => {
  const callback = (epoch, log) => {
    console.log("Epoch: " + epoch);
    console.log(log);
  };

  const model = createModel();
  model.summary();

  model.compile({
    optimizer: tf.train.adagrad(learningRate),
    loss: "categoricalCrossentropy",
  });

  // ## weight adjustment / debugging

  // for (let i = 0; i < model.layers.length; i++) {
  //   console.log(model.layers[i].trainableWeights)
  // }
  // model.layers[3].setWeights([tf.zeros([6,2]), tf.zeros([6, 2])])
  // model.layers[3].getWeights()[0].print();
  // model.layers[3].getWeights()[1].print();

  const history = await model.fit(xs, ys, {
    batchSize: batchSize,
    epochs: nEpochs,
    validationSplit: 0.25,
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, log) => {
        callback(epoch, log);
      },
    },
  });

  return [model, history];
};

const createModel = () => {
  const unitsPerLayer = [256, 128];

  const model = tf.sequential();
  model.add(
    tf.layers.masking({ inputShape: inputLayerShape, maskValue: specialChar })
  );
  // model.add(tf.layers.flatten({ inputShape: inputLayerShape }));
  // model.add(tf.layers.reshape({ targetShape: inputLayerShape }));
  let lstmCells = [];
  for (let i = 0; i < unitsPerLayer.length - 1; i++) {
    lstmCells.push(tf.layers.lstmCell({ units: unitsPerLayer[i] }));
  }
  model.add(
    tf.layers.rnn({
      cell: lstmCells,
      //inputShape: [16,16],
      //returnSequences: false,
      activation: "relu",
      mask_zero: true,
    })
  );
  model.add(tf.layers.dropout({ rate: 0.5 }));
  // model.add(tf.layers.dense({ units: 256, activation: "relu" }));
  model.add(tf.layers.dense({ units: 2, activation: "softmax" }));
  return model;
};

const saveModel = async (model) => {
  await model.save("downloads://wyckoff-ai-model");
  console.log("Saving model and weights to the browser's downloads folder.")
}

const makePredictions = (data, model, padMax) => {
  const inputLayerShape = [2, padMax]; // equals the maximum sized time series set (# of days) in the data
  const [X, Y, paddingArray] = reformatRawData(
    data,
    specialChar,
    inputLayerShape
  );

  const inputTensor = tf.tensor3d(X);
  
  const normalizedInput = normalizeTensorFit(inputTensor, paddingArray, padMax);
  // const predictedResults = model.predict(tf.tensor2d(X, [X.length, X[0].length]).div(tf.scalar(10))).mul(10); // old method

  const modelOut = model.predict(normalizedInput);
  //const predictedResults = unNormalizeTensor(modelOut, dict_normalize["labelMax"], dict_normalize["labelMin"]);

  //return [Y, Array.from(modelOut.dataSync())];

  inputTensor.dispose();
  normalizedInput.dispose();

  return [Y, modelOut];
};

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
const reformatRawData = (data, specialChar, inputLayerShape) => {
  // Makes an array of data stationary through differencing
  const dataDifferencing = (data) => {
    let dataDiff = [];
    for (let x = 1; x < data.length; x++) {
      let yDiff = data[x] - data[x-1];
      dataDiff.push(yDiff);
    }
    return dataDiff;
  }

  // BEFORE DATA DIFFERENCING

  let X = [];
  let Y = [];
  let paddingArray = [];

  for (let i = 0; i < data.length; i++) {
    X.push([
      [...data[i].f1],
      [...data[i].f2],
      //[...data[i].f3],
      //[...data[i].f4],
    ]);
    paddingArray.push(X[i][0].length);
    // provide padding for short length arrays
    for (let j = X[i][0].length; j < inputLayerShape[1]; j++) {
      X[i][0].push(specialChar);
      X[i][1].push(specialChar);
      //X[i][2].push(specialChar);
      //X[i][3].push(specialChar);
    }
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
      data[i].accumulationStatus == 0 // false accumulation pattern
        ? [1, 0]
         // accumulation pattern ending at a spring in phase C or in progress
        : [0, 1]
    );
  }
  return [X, Y, paddingArray];

   // AFTER DATA DIFFERENCING

  // let X = [];
  // let Y = [];
  // let paddingArray = [];

  // data.forEach((stock) => {
  //   console.log("data1: ", [...stock.f1]);
  //   console.log("data2: ", dataDifferencing([...stock.f1]));

  //   X.push([
  //     dataDifferencing([...stock.f1]),
  //     dataDifferencing([...stock.f2]),
  //     dataDifferencing([...stock.f3]),
  //     dataDifferencing([...stock.f4])
  //   ]);

  // });


  // // Define the data to be tested
  // const testdata = [0.2, 0.5, 0.7, 1.0, 1.5, 1.9, 2.3, 2.7, 3.1, 3.4, 3.7, 4.0];

  // // Run the ADF test on the data
  // const adf = R("adf.test", testdata, {
  //   alternative: "stationary",
  //   k: "short"
  // });

  // // Print the test results
  // console.log(adf);

  
  // return [X, Y, paddingArray];
};


const normalizeTensorFit = (tensor, paddingArray, padMax) => {
  //tensor.print(true)
  let i = 0;
  let normalizedTensors = [];
  tf.unstack(tensor).forEach((stockTensor) => {
    // extract prices and volumes from each stock, and remove padding
    let stockPricesTensor = tf.slice(
      tf.unstack(stockTensor)[0],
      0,
      paddingArray[i]
    );
    let stockVolumesTensor = tf.slice(
      tf.unstack(stockTensor)[1],
      0,
      paddingArray[i]
    );
    // Benchmark feature processing is temporarily disabled.

    // let benchPricesTensor = tf.slice(
    //   tf.unstack(stockTensor)[2],
    //   0,
    //   paddingArray[i]
    // );
    // let benchVolumesTensor = tf.slice(
    //   tf.unstack(stockTensor)[3],
    //   0,
    //   paddingArray[i]
    // );

    let maxStockPrice = stockPricesTensor.max();
    let minStockPrice = stockPricesTensor.min();
    let maxStockVolume = stockVolumesTensor.max();
    let minStockVolume = stockVolumesTensor.min();
    // let maxBenchPrice = benchPricesTensor.max();
    // let minBenchPrice = benchPricesTensor.min();
    // let maxBenchVolume = benchVolumesTensor.max();
    // let minBenchVolume = benchVolumesTensor.min();

    // use linear scaling equation x' = (x - xmin) / (xmax - xmin) for prices and volumes seperately
    let normalizedStockPricesTensor = stockPricesTensor
      .sub(minStockPrice)
      .div(maxStockPrice.sub(minStockPrice));
    let normalizedStockVolumesTensor = stockVolumesTensor
      .sub(minStockVolume)
      .div(maxStockVolume.sub(minStockVolume));
    // let normalizedBenchPricesTensor = benchPricesTensor
    //   .sub(minBenchPrice)
    //   .div(maxBenchPrice.sub(minBenchPrice));
    // let normalizedBenchVolumesTensor = benchVolumesTensor
    //   .sub(minBenchVolume)
    //   .div(maxBenchVolume.sub(minBenchVolume));

    //let padMax = Math.max(...paddingArray);
    let normalizedStockTensor = tf.stack([
      normalizedStockPricesTensor.pad(
        [[0, padMax - paddingArray[i]]],
        specialChar
      ),
      normalizedStockVolumesTensor.pad(
        [[0, padMax - paddingArray[i]]],
        specialChar
      ),
      // normalizedBenchPricesTensor.pad(
      //   [[0, padMax - paddingArray[i]]],
      //   specialChar
      // ),
      // normalizedBenchVolumesTensor.pad(
      //   [[0, padMax - paddingArray[i]]],
      //   specialChar
      // ),
    ]);
    normalizedTensors.push(normalizedStockTensor);

    maxStockPrice.dispose();
    minStockPrice.dispose();
    maxStockVolume.dispose();
    minStockVolume.dispose();
    // maxBenchPrice.dispose();
    // minBenchPrice.dispose();
    // maxBenchVolume.dispose();
    // minBenchVolume.dispose();
    stockPricesTensor.dispose();
    stockVolumesTensor.dispose();
    normalizedStockPricesTensor.dispose();
    normalizedStockVolumesTensor.dispose();
    // benchPricesTensor.dispose();
    // benchVolumesTensor.dispose();
    // normalizedBenchPricesTensor.dispose();
    // normalizedBenchVolumesTensor.dispose();
    i++;
  });

  let normalizedTensor = tf.stack(normalizedTensors);
  //normalizedTensor.print(true)
  return normalizedTensor;
};

module.exports = {
  modelMain,
  makePredictions
};
