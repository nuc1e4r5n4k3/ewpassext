const makeConfig = require('./webpack.makeconfig');

module.exports = makeConfig(
    './src/scriptinjections/popuphook', 
    './build/scriptinjections/popuphook.js'
);
