module.exports = (project) => ({
    entry: ['./src/' + project],
    mode: 'production',
    output: {
        path: __dirname,
        filename: './build/' + project + '.js'
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
