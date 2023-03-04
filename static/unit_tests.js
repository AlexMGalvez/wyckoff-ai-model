// Unit tests file not integrated yet

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
