const makeConfig = require('./webpack.makeconfig');

module.exports = makeConfig(
    './src/scriptinjections/injectpassword', 
    './build/scriptinjections/injectpassword.js'
);
