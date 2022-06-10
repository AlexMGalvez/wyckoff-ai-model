# Wyckoff.AI Model

![alt text](https://github.com/AlexMGalvez/wyckoff-ai-website/blob/master/public/images/logo-large-light-min.png?raw=true)

> Wyckoff.AI aims to make traditionally closed source institution-grade trading software free, open source and easily accessible from the browser

## General Info
This is an AI-assisted stock trader’s financial instrument for detecting stock market manipulation patterns as per the technical analysis principles of one of the five "titans of technical analysis", Richard Wyckoff. 

The goal of this software is to assist with a trader’s decision in identifying profitable high-reward/low-risk entry positions of a stock by classifying price consolidation periods as either in "accumulation" or "distribution".

## Technical Info
This repository is a machine learning model for classifying time series patterns using a recurrent neural network and LSTM in TensorFlow.js. The model compares a given input with a market benchmark and 50 years of industry leading stock patterns to best predict its likely pattern. Despite lacking a sufficient amount of training data and having current issues with under fitting, the model successfully classifies a given stock pattern to two possible outputs with consistent results between 60-70% accuracy. More data collection and optimizations are required to improve performance.

## Instructions
Download project, open in an IDE, run the local development server with 'npm run start', open home.ejs in a browser.

## Technologies
* Node.js - version 16.14.0
* Tensorflow.js - version 2.0.0

## Features
This project includes:
* Tensor padding and masking for irregular sized data
* Built in optimization tools and loss plot

