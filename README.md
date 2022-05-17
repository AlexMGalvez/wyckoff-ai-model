# Wyckoff AI Model

> This is a machine learning model for time series pattern recognition using a recurrent neural network and LSTM in TensorFlow.js

## General Info
This time series pattern recognition model identifies the probability that a validation set of stock data meets the characteristics of a Wyckoff accumulation pattern in it's different phases. The gathering of training data is an on going work in progress, and the layers and neurons have yet to be fully optimized. The model trains and validates properly without error, but the output is currently inaccurate and useless until further optimization is made.

## Instructions
Download project, open in an IDE, run the local development server with 'npm run start', open home.ejs in a browser.

## Technologies
* Node.js - version 16.14.0
* Tensorflow.js - version 2.0.0

## Features
This model includes:
* Tensor padding and masking function for irregular sized data
* One recurrent layer with LSTM cells 

