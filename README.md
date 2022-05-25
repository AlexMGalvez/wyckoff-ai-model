# Wyckoff.AI Model - A Work in Progress

> Wyckoff AI aims to make traditionally closed source and institution hidden cutting-edge trading software free and open source to the public and easily accessible from the browser

## General Info
This is an AI-assisted stock trader’s financial instrument for detecting stock market manipulation patterns as per the technical analysis principles of one of the five "titans of technical analysis", Richard Wyckoff. 

The goal of this software is to assist with a trader’s decision in identifying potential high-reward/low-risk long positions of a stock strategically during phases when large institutional interests are simultaneously planning to markup their holdings.

The incomplete model shows early promising results but given the time-consuming and ambitious nature of this project, it is far from producing consistently reliable output. The gathering of training data is an on going work in progress, and the layers and neurons have yet to be fully optimized. The model currently has an issue with underfitting, and is expected to continue producing inaccurate output until further data collection and optimizations are made.

## Technical Info
This repository is a machine learning model for classifying time series patterns using a recurrent neural network and LSTM in TensorFlow.js

## Instructions
Download project, open in an IDE, run the local development server with 'npm run start', open home.ejs in a browser.

## Technologies
* Node.js - version 16.14.0
* Tensorflow.js - version 2.0.0

## Features
This project includes:
* Tensor padding and masking for irregular sized data
* Built in optimization tools and loss plot

