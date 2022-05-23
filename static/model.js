const specialChar = -10;
const inputLayerNeurons = 64;
let inputLayerShape = [4];
const rnnOutputNeurons = 16;
const rnnInputShape = [16, 4];
const outputLayerNeurons = 1;
const outputLayerShape = 16;
const nLayers = 4;
const learningRate = 0.07755610490268464;
const batchSize = 32;
const nEpochs = 50;
const rnn_input_layer_features = 16;
const rnn_input_layer_timesteps = inputLayerNeurons / rnn_input_layer_features;
const rnn_input_shape = [rnn_input_layer_features, rnn_input_layer_timesteps];

/*
  Runs trials for finding the optimal loss function, epoch number, and learning rate
*/
const runTrials = async (xs, ys) => {
  const optimizers = {
    sgd: tf.train.sgd,
    adagrad: tf.train.adagrad,
    adam: tf.train.adam,
    adamax: tf.train.adamax,
    rmsprop: tf.train.rmsprop,
  }

  const space = {
    epochs: hpjs.quniform(50, 250, 50),
    learningRate: hpjs.loguniform(-4*Math.log(10), -1*Math.log(10)),
    optimizer: hpjs.choice(['sgd', 'adagrad', 'adam', 'adamax',           
     'rmsprop'])
  };

  const optFunction = async ({ optimizer, epochs }, { xs, ys }) => {
    const model = createModel();
    model.compile({
      optimizer: optimizers[optimizer](learningRate),
      loss: "categoricalCrossentropy",
    });
  
    // train model using defined data
    const h = await model.fit(xs, ys, {
      batchSize: batchSize,
      epochs,
      validationSplit: 0.25,
      shuffle: true
    });
  
    //print out each optimizer and its loss
    console.log(optimizer, h.history.loss[h.history.loss.length - 1]);
    // return the model, loss, and status, which is necessary
    return {
      model,
      loss: h.history.loss[h.history.loss.length - 1],
      status: hpjs.STATUS_OK,
    };
  };
  
  const trials = await hpjs.fmin(
    optFunction,
    space,
    hpjs.search.randomSearch,
    6,
    { rng: new hpjs.RandomState(654321), xs, ys }
  );
  const opt = trials.argmin;

  // displaying data for best optimizer and epochs, as well as a prediction
  console.log(`Best Optimizer: ${opt.optimizer}`);
  console.log(`Best Epochs: ${opt.epochs}`);
  console.log(`Best Learning Rate: ${opt.learningRate}`);
  const { model } = await optFunction(opt, { xs, ys });
  return model;
}

const runOptimized = async (xs, ys) => {
  const model = createModel();

  model.compile({
    optimizer: tf.train.sgd(learningRate),
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
}

const trainModel = async (data, padMax) => {
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

  //const model = runTrials(xs, ys);
  const [model, history] = await runOptimized(xs, ys);
  // xs.dispose();
  // ys.dispose();

  return [model, history];
}

const createModel = () => {
  const model = tf.sequential();
  model.add(
    tf.layers.masking({ inputShape: inputLayerShape, maskValue: specialChar })
  );
  model.add(tf.layers.flatten({ inputShape: inputLayerShape }));
  model.add(tf.layers.reshape({ targetShape: inputLayerShape }));
  let lstmCells = [];
  for (let i = 0; i < 2; i++) {
    lstmCells.push(tf.layers.lstmCell({ units: 256 }));
  }
  model.add(
    tf.layers.rnn({
      cell: lstmCells,
      //inputShape: [16,16],
      //returnSequences: false,
      activation: "relu",
    })
  );
  model.add(tf.layers.dense({ units: 3, activation: "softmax" }));
  return model;
};

const callback = (epoch, log) => {
  console.log("Epoch: " + epoch);
  console.log(log);
};

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
}

/*
  Reformats raw data into X and Y arrays for feeding into the neural network and provides a padding index array.

  Returns:
    X is defined as an input array of stock pattern arrays, each stock array containing 4 feature arrays of padMax length.
    X = [[feature1 array, feature2 array, feature3 array, feature4 array], ...]

    Y is defined as an output array containing one hot encoded arrays representing the output of each stock. Ex: [0, 1, 0]
    Y = [[num, num, num], ...]

    paddingArray is an array of numbers representing the indexes of each stock where padding begins.
*/
const reformatRawData = (data, specialChar, inputLayerShape) => {
  let X = [];
  let Y = [];
  let paddingArray = [];

  for (let i = 0; i < data.length; i++) {
    X.push([
      [...data[i].f1],
      [...data[i].f2],
      [...data[i].f3],
      [...data[i].f4],
    ]);
    paddingArray.push(X[i][0].length);
    // provide padding for short length arrays
    for (let j = X[i][0].length; j < inputLayerShape[1]; j++) {
      X[i][0].push(specialChar);
      X[i][1].push(specialChar);
      X[i][2].push(specialChar);
      X[i][3].push(specialChar);
    }
    Y.push(
      data[i].accumulationStatus == 0 // false accumulation pattern
        ? [1, 0, 0]
        : data[i].accumulationStatus == 1 // accumulation pattern ending at a spring in phase C
        ? [0, 1, 0]
        : [0, 0, 1] // incomplete accumulation pattern ending at a secondary test in phase B
    );
  }
  return [X, Y, paddingArray];
};

const normalizeTensorFit = (tensor, paddingArray, padMax) => {
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
    let benchPricesTensor = tf.slice(
      tf.unstack(stockTensor)[2],
      0,
      paddingArray[i]
    );
    let benchVolumesTensor = tf.slice(
      tf.unstack(stockTensor)[3],
      0,
      paddingArray[i]
    );

    let maxStockPrice = stockPricesTensor.max();
    let minStockPrice = stockPricesTensor.min();
    let maxStockVolume = stockVolumesTensor.max();
    let minStockVolume = stockVolumesTensor.min();
    let maxBenchPrice = benchPricesTensor.max();
    let minBenchPrice = benchPricesTensor.min();
    let maxBenchVolume = benchVolumesTensor.max();
    let minBenchVolume = benchVolumesTensor.min();

    // use linear scaling equation x' = (x - xmin) / (xmax - xmin) for prices and volumes seperately
    let normalizedStockPricesTensor = stockPricesTensor
      .sub(minStockPrice)
      .div(maxStockPrice.sub(minStockPrice));
    let normalizedStockVolumesTensor = stockVolumesTensor
      .sub(minStockVolume)
      .div(maxStockVolume.sub(minStockVolume));
    let normalizedBenchPricesTensor = benchPricesTensor
      .sub(minBenchPrice)
      .div(maxBenchPrice.sub(minBenchPrice));
    let normalizedBenchVolumesTensor = benchVolumesTensor
      .sub(minBenchVolume)
      .div(maxBenchVolume.sub(minBenchVolume));

    //let padMax = Math.max(...paddingArray);
    let normalizedStockTensor = tf.stack([
      normalizedStockPricesTensor.pad([[0, padMax - paddingArray[i]]], -10),
      normalizedStockVolumesTensor.pad([[0, padMax - paddingArray[i]]], -10),
      normalizedBenchPricesTensor.pad([[0, padMax - paddingArray[i]]], -10),
      normalizedBenchVolumesTensor.pad([[0, padMax - paddingArray[i]]], -10),
    ]);
    normalizedTensors.push(normalizedStockTensor);

    stockPricesTensor.dispose();
    stockVolumesTensor.dispose();
    normalizedStockPricesTensor.dispose();
    normalizedStockVolumesTensor.dispose();
    benchPricesTensor.dispose();
    benchVolumesTensor.dispose();
    normalizedBenchPricesTensor.dispose();
    normalizedBenchVolumesTensor.dispose();
    i++;
  });

  let normalizedTensor = tf.stack(normalizedTensors);
  return normalizedTensor;
}
