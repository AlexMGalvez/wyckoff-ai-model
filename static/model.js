const tf = require("@tensorflow/tfjs-node");
const hpjs = require("hyperparameters");

const dataModelProcessing = require("./data_model_processing.js");
const reformatRawData = dataModelProcessing.reformatRawData;

const specialChar = 0;
const inputLayerNeurons = 64;
let inputLayerShape = [2]; //4
const rnnOutputNeurons = 16;
const rnnInputShape = [16, 4];
const outputLayerNeurons = 1;
const outputLayerShape = 16;
const nLayers = 4;
const learningRate = 0.00011540514497336694;
const batchSize = 32;
const nEpochs = 200; //200
const validationSplit = 0.15; //0.25
const rnn_input_layer_features = 2; //4
const rnn_input_layer_timesteps = inputLayerNeurons / rnn_input_layer_features;
const rnn_input_shape = [rnn_input_layer_features, rnn_input_layer_timesteps];

const modelMain = async (data, padMax) => {
  inputLayerShape.push(padMax);
  const [X, Y, paddingArray] = reformatRawData(  // reformat, difference, normalize, and pad data
    data,
    specialChar,
    inputLayerShape,
    true
  );

  const xs = tf.tensor3d(X);
  const ys = tf.tensor2d(Y);
  
  //const [model, history] = await trialTraining(xs, ys);
  const [model, history] = await optimizedTraining(xs, ys);
  xs.dispose();
  ys.dispose();

  return [model, history];
};

const optimizedTraining = async (xs, ys) => {
  const callback = (epoch, log) => {
    // console.log("Epoch: " + epoch);
    // console.log(log);
  };

  const model = createModel();
  model.summary();

  model.compile({
    optimizer: tf.train.adamax(learningRate),
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
    validationSplit: validationSplit,
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, log) => {
        callback(epoch, log);
      },
    },
  });

  return [model, history];
};

/*
  Runs trials for finding the optimal loss function, epoch number, and learning rate
*/
const trialTraining = async (xs, ys) => {
  console.log("Running trials...")
  const optimizers = {
    sgd: tf.train.sgd,
    adagrad: tf.train.adagrad,
    adam: tf.train.adam,
    adamax: tf.train.adamax,
    rmsprop: tf.train.rmsprop,
  };

  const space = {
    epochs: hpjs.quniform(50, 250, 50),
    learningRate: hpjs.loguniform(-4 * Math.log(10), -1 * Math.log(10)),
    optimizer: hpjs.choice(["sgd", "adagrad", "adam", "adamax", "rmsprop"]),
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
      shuffle: true,
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
  //return model;
  return [model, null];
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
  const [X, Y, paddingArray] = reformatRawData( // reformat, difference, normalize, and pad data
    data,
    specialChar,
    inputLayerShape,
    false
  );

  const inputTensor = tf.tensor3d(X);
  const modelOut = model.predict(inputTensor);

  inputTensor.dispose();

  return [Y, modelOut];
};

module.exports = {
  modelMain,
  makePredictions
};
