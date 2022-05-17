async function trainModel(data, padMax) {
  let X = [];
  let Y = [];
  let paddingArray = []; // array of padding starting indexes
  const specialChar = -10;

  const inputLayerNeurons = 64;
  //padMax = 128 in this example
  const inputLayerShape = [2, padMax]; // equals the maximum sized time series set (# of days) in the data
  const rnnOutputNeurons = 16;
  const rnnInputShape = [16, 4];
  const outputLayerNeurons = 1;
  const outputLayerShape = 16;
  const nLayers = 4;
  const learningRate = 0.01;
  const batchSize = 32;
  const nEpochs = 50;

  const rnn_input_layer_features = 16;
  const rnn_input_layer_timesteps =
    inputLayerNeurons / rnn_input_layer_features;
  const rnn_input_shape = [rnn_input_layer_features, rnn_input_layer_timesteps];

  // reformat data into X and Y arrays
  for (let i = 0; i < data.length; i++) {
    X.push([[...data[i].y], [...data[i].z]]);
    paddingArray.push(X[i][0].length);
    // provide padding for short length arrays
    for (let j = X[i][0].length; j < inputLayerShape[1]; j++) {
      X[i][0].push(specialChar);
      X[i][1].push(specialChar);
    }
    //Y.push(data[i].accumulation);
    Y.push(
      data[i].accumulation == 0
        ? [1, 0, 0, 0]
        : data[i].accumulation == 1
        ? [0, 1, 0, 0]
        : data[i].accumulation == 2
        ? [0, 0, 1, 0]
        : [0, 0, 0, 1]
    );
  }

  const inputTensor = tf.tensor3d(X);
  //const labelTensor = tf.tensor3d(Y, [Y.length, 1, 1]);
  const labelTensor = tf.tensor2d(Y);

  const xs = normalizeTensorFit(inputTensor, paddingArray, inputLayerShape[1]); // labelTensor is already normalized

  // ## define model
  const model = tf.sequential();

  model.add(tf.layers.masking({ inputShape: inputLayerShape, maskValue: -10 }));
  model.add(tf.layers.flatten({ inputShape: inputLayerShape })); // flatten 2d input layer into 1d for the dense layer

  // model.add(
  //   tf.layers.dense({
  //     units: inputLayerNeurons,
  //   })
  // );

  // model.add(
  //   tf.layers.dense({
  //     units: 256
  //   })
  // );

  model.add(tf.layers.reshape({ targetShape: [2, 150] }));

  let lstmCells = [];
  for (let i = 0; i < 2; i++) {
    lstmCells.push(tf.layers.lstmCell({ units: 8 }));
  }

  model.add(
    tf.layers.rnn({
      cell: lstmCells,
      //inputShape: [16,16],
      returnSequences: false,
      activation: 'relu'
    })
  );

  // model.add(
  //   tf.layers.dense({
  //     units: 16,
  //   })
  // );

  //model.add(tf.layers.reshape({targetShape: [16]}));

  model.add(tf.layers.dense({ units: 4, activation: 'softmax' }));

  //model.add(tf.layers.dense({ units: 1 }));

  model.summary();
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

  // ## fit model

  const hist = await model.fit(xs, labelTensor, {
    batchSize: batchSize,
    epochs: nEpochs,
    callbacks: {
      onEpochEnd: async (epoch, log) => {
        callback(epoch, log);
      },
    },
  });

  return model;
}

const callback = (epoch, log) => {
  console.log("Epoch: " + epoch);
  console.log(log);
};

function makePredictions(data, model, padMax) {
  let X = [];
  let Y = [];
  let paddingArray = []; // array of padding starting indexes
  const specialChar = -10;
  const inputLayerShape = [2, 150]; // equals the maximum sized time series set (# of days) in the data

  for (let i = 0; i < data.length; i++) {
    X.push([[...data[i].y], [...data[i].z]]);
    paddingArray.push(X[i][0].length);
    // provide padding for short length arrays
    for (let j = X[i][0].length; j < inputLayerShape[1]; j++) {
      X[i][0].push(specialChar);
      X[i][1].push(specialChar);
    }
    //Y.push(data[i].accumulation);
    Y.push(
      data[i].accumulation == 0
        ? [1, 0, 0, 0]
        : data[i].accumulation == 1
        ? [0, 1, 0, 0]
        : data[i].accumulation == 2
        ? [0, 0, 1, 0]
        : [0, 0, 0, 1]
    );
  }

  const inputTensor = tf.tensor3d(X);
  const normalizedInput = normalizeTensorFit(inputTensor, paddingArray, padMax);
  // const predictedResults = model.predict(tf.tensor2d(X, [X.length, X[0].length]).div(tf.scalar(10))).mul(10); // old method

  const model_out = model.predict(normalizedInput);
  //const predictedResults = unNormalizeTensor(model_out, dict_normalize["labelMax"], dict_normalize["labelMin"]);

  //return [Y, Array.from(model_out.dataSync())];
  return [Y, model_out.arraySync()];
}

function normalizeTensorFit(tensor, paddingArray, padMax) {
  let i = 0;
  let normalizedTensors = [];
  tf.unstack(tensor).forEach((stockTensor) => {
    // extract prices and volumes from each stock, and remove padding
    let pricesTensor = tf.slice(tf.unstack(stockTensor)[0], 0, paddingArray[i]);
    let volumesTensor = tf.slice(
      tf.unstack(stockTensor)[1],
      0,
      paddingArray[i]
    );

    let maxPrice = pricesTensor.max();
    let minPrice = pricesTensor.min();
    let maxVolume = volumesTensor.max();
    let minVolume = volumesTensor.min();

    // use linear scaling equation x' = (x - xmin) / (xmax - xmin) for prices and volumes seperately
    let normalizedPricesTensor = pricesTensor
      .sub(minPrice)
      .div(maxPrice.sub(minPrice));
    let normalizedVolumesTensor = volumesTensor
      .sub(minVolume)
      .div(maxVolume.sub(minVolume));

    //let padMax = Math.max(...paddingArray);
    let normalizedStockTensor = tf.stack([
      normalizedPricesTensor.pad([[0, padMax - paddingArray[i]]], -10),
      normalizedVolumesTensor.pad([[0, padMax - paddingArray[i]]], -10),
    ]);
    normalizedTensors.push(normalizedStockTensor);
    i++;
  });

  let normalizedTensor = tf.stack(normalizedTensors);
  return normalizedTensor;
}
