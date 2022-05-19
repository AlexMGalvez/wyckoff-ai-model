# Wyckoff AI Model

> This is a machine learning model for time series pattern recognition using a recurrent neural network and LSTM in TensorFlow.js

## General Info
This is an AI-assisted stock trader’s financial instrument for detecting stock market manipulation patterns as per the technical analysis principles of Richard Wyckoff. The goal of this software is to assist with a stock trader’s decision in identifying potential high-reward/low-risk long positions strategically during phases where large institutional interests are simultaneously expecting to markup their holdings of the asset in question.

Wyckoff AI, however, is far from completion given the time-consuming and ambitious nature of this project. The gathering of training data is an on going work in progress, and the layers and neurons have yet to be fully optimized. The model trains and tests properly without error, but the output is currently inaccurate and useless until further data collection and optimization is made.

## Technical Info
The time series pattern recognition model identifies the probability that a testing set of stock data meets the criteria of a Wyckoff accumulation pattern in it's different phases. 

## Instructions
Download project, open in an IDE, run the local development server with 'npm run start', open home.ejs in a browser.

## Technologies
* Node.js - version 16.14.0
* Tensorflow.js - version 2.0.0

## Features
This model includes:
* Tensor padding and masking function for irregular sized data
* One recurrent layer with LSTM cells 

