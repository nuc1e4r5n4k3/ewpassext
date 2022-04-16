module.exports = (sourceDir, target) => ({
    entry: [sourceDir],
    mode: 'production',
    output: {
        path: __dirname,
        filename: target
    },
    resolve: {
        extensions: ['.js', '.ts']
    },
    module: {
        rules: [{
            test: /\.(js|ts)$/,
            exclude: /node_modules/,
            loader: 'babel-loader'
        }]
    }
});
