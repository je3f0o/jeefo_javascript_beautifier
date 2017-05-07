#!/bin/bash

node build && echo "Build succeed!"
npm publish . && echo "Successfully published !"
