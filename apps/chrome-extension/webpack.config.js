const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      background: './background.js',
      sidepanel: './sidepanel.js',
      popup: './popup.js',
      content: './content.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { 
            from: 'manifest.json',
            to: 'manifest.json'
          },
          {
            from: 'sidepanel.html',
            to: 'sidepanel.html'
          },
          {
            from: 'popup.html',
            to: 'popup.html'
          },
          {
            from: 'styles',
            to: 'styles'
          },
          {
            from: 'assets',
            to: 'assets',
            noErrorOnMissing: true
          }
        ]
      })
    ],
    optimization: {
      minimize: isProduction,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all'
          }
        }
      }
    },
    devtool: isProduction ? false : 'source-map',
    resolve: {
      extensions: ['.js', '.json']
    },
    target: 'web'
  };
};