const makeConfig = require('./webpack.makeconfig');

module.exports = makeConfig(
    './src/serviceworker', 
    './build/serviceworker.js'
);
