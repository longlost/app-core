
'use strict';

/* global __dirname module require*/
/* eslint comma-dangle: ["error", "never"] */

const path = require('path');

const toolsPath = str => path.resolve(`tools/node_modules/${str}`);

const {webpackConfig}            = require(path.resolve('src/config.js'));
const webpack                    = require(toolsPath('webpack'));
const TerserPlugin               = require(toolsPath('terser-webpack-plugin'));
const BundleAnalyzerPlugin       = require(toolsPath('webpack-bundle-analyzer')).BundleAnalyzerPlugin;
const {CleanWebpackPlugin}       = require(toolsPath('clean-webpack-plugin'));
const SitemapPlugin              = require(toolsPath('sitemap-webpack-plugin')).default;
const CopyWebpackPlugin          = require(toolsPath('copy-webpack-plugin'));
const HtmlWebpackPlugin          = require(toolsPath('html-webpack-plugin'));
const FaviconsWebpackPlugin      = require(toolsPath('favicons-webpack-plugin'));
const ImageMinimizerPlugin       = require(toolsPath('image-minimizer-webpack-plugin'));
const WorkboxPlugin              = require(toolsPath('workbox-webpack-plugin'));
const BrowserSyncPlugin          = require(toolsPath('browser-sync-webpack-plugin'));
const HistoryApiFallback         = require(toolsPath('connect-history-api-fallback'));
const WebpackBuildNotifierPlugin = require(toolsPath('webpack-build-notifier'));


// App specific, from src/config.js.
const {
  background_color,
  cacheId,
  description,
  developerName,
  developerURL,
  display,
  name,
  routes,
  short_name,
  theme_color,
  title,
  url,
  version
} = webpackConfig;


// babel-loader helper.
// Must run some node_nodules that are written in es6+ through babel.
const babelLoaderExcludeNodeModulesExcept = exceptionList => {

  if (Array.isArray(exceptionList) && exceptionList.length) {
    return new RegExp(`node_modules[\\/|\\\\](?!(${exceptionList.join('|')})).*`, 'i');
  }

  return /node_modules/i;
};


const resolve = {

  // Exposes a node.js like 'path' dependency to all modules.
  fallback: { 
    'path': require.resolve(toolsPath('path-browserify')) 
  },
  modules:          [path.resolve('src'), 'node_modules'],
  descriptionFiles: ['package.json']
};


const resolveLoader = {

  // An array of directory names to be resolved to the current directory.
  modules: [path.resolve('tools/node_modules')]
};


const optimization = {
  minimizer: [
    new TerserPlugin({
      parallel: true,
      terserOptions: {
        output: {
          comments: false
        }
      },
      extractComments: false
    }),

    new ImageMinimizerPlugin({
      minimizer: {
        implementation: ImageMinimizerPlugin.imageminMinify,
        options: {
          plugins: [

            // optimizationLevel determines how much processing resources to use
            // for reducing file size. 
            // 3 takes the longest but may lead to smaller file sizes.
            ['imagemin-gifsicle', {optimizationLevel: 3}], // optimizationLevel: 1-3, default 1.
            ['imagemin-mozjpeg',  {quality: 90}],          // quality: 0-100, default 75.
            ['imagemin-optipng'],
            ['imagemin-svgo']
          ]
        }        
      },
      generator: [{

        // You can apply generator using `?as=webp`, ie. "./file.jpg?as=webp".
        preset: 'webp',
        implementation: ImageMinimizerPlugin.imageminGenerate,
        options: {
          plugins: [['imagemin-webp', {quality: 90}]] // quality: 0-100, default 75.
        }
      }]
    })
  ],
  runtimeChunk: true,

  // This option enables smart code splitting. 
  // With it, webpack would extract the vendor code 
  // if it gets larger than 30 kB (before minification and gzip). 
  // It would also extract the common code – 
  // this is useful if your build produces several bundles 
  // (e.g. if you split your app into routes).
  splitChunks: {
    chunks: 'all'
  }
};


const wasmLoader = { 
  test:    /\.wasm$/,
  type:   'javascript/auto',
  loader: 'file-loader',
  options: {
    name: '[name]-[contenthash].[ext]'
  }        
};


const htmlLoader = {
  test: /\.(html)$/,
  use: [

    // Prepares html files for use with Polymer elements. (ie html`<div>Hi</div>`).
    'polymer-html-loader',

    // Required preprocessing for 'polymer-html-loader'.
    // Transforms the output webpack Module from 'html-loader' 
    // back into a string from the original source file content,
    // so it can be processed further.
    'extract-loader', 
    'html-loader'
  ]
};


const workerLoader = {
  test: /worker\.js$/,
  loader: 'worker-loader'
};


const cssLoader = {
  test: /\.css$/,
  use: [

    // Prepares css files for use with Polymer elements. (ie <style include="mycss">).
    'polymer-css-loader', 
    'extract-loader', // Required preprocessing for 'polymer-css-loader'. 
    {
      loader: 'css-loader',
      options: {
        esModule: false, // Module syntax does not work as input to 'extract-loader'.
        import:   false  // Resolves an issue with 'firebaseui' css file.
      }
    }
  ]
};

// Specifically for 'typeface-' self hosted font-family node_modules.
const fileLoader = {
  test: /\.(woff|woff2|eot|ttf)$/, 
  loader: 'file-loader' 
};


const responsiveLoader = {
  test: /\.(jpe?g|png|webp)$/i,
  loader: 'responsive-loader',
  options: {

    // Use Sharp instead of Jimp to allow webp support.
    adapter:         require(toolsPath('responsive-loader/sharp')),
    esModule:        true,  // Allow tree shaking.  
    format:         'webp', // Convert jpeg and png to webp.   
    name:           '[name]-[width]-[contenthash].[ext]',
    outputPath:     'responsive/',      
    placeholder:     true,
    placeholderSize: 50,
    quality:         90, // Default is 85.
    sizes:           [300, 600, 900, 1200, 1500]
  }
};


const htmlMinifierLoader = {
  test:    /\.js$/,
  exclude: babelLoaderExcludeNodeModulesExcept([
    '@longlost',
    '@polymer'
  ]),
  loader: 'babel-loader',
  options: {
    plugins: [
      [toolsPath('babel-plugin-template-html-minifier'), {
        modules: {
          '@polymer/lit-element/lit-element.js':    ['html'],
          '@polymer/polymer/polymer-element.js':    ['html'],
          '@polymer/polymer/polymer-legacy.js':     ['html'],
          '@polymer/polymer/lib/utils/html-tag.js': ['html', 'htmlLiteral'],               
          '@longlost/app-core/app-element.js':      ['html']
        },
        htmlMinifier: {
          collapseWhitespace: true,
          minifyCSS:          true,
          removeComments:     true
        }
      }]
    ]
  }
};


module.exports = {
  mode: 'production',

  // Better debugging info for vague errors.
  stats: { 
    children: true 
  },
  entry: [
    toolsPath('@webcomponents/shadycss/entrypoints/custom-style-interface.js'),
    path.resolve('src/index.js')
  ],
  output: {
    filename:      '[name].[chunkhash].js',
    chunkFilename: '[name].[chunkhash].js',
    path:           path.resolve('dist'),

    // From webpack.js.org website on migrating from webpack 4x to 5x:
    //
    // Not all ecosystem tooling is ready for the new default automatic 
    // publicPath via output.publicPath: "auto".
    //
    // MUST be set, otherwise manifest and sw plugins will prepend file 
    // paths with 'auto' which does not exist in the output folder structure.
    publicPath:   '', 
    globalObject: 'this' // Addresses an issue with async imports in Web Worker files.
  },
  resolve,
  resolveLoader,
  optimization,
  module: {
    rules: [
      wasmLoader,
      htmlLoader, 
      workerLoader,
      cssLoader,
      fileLoader,
      responsiveLoader,      
      htmlMinifierLoader
    ]
  },
  plugins: [ 

    // new BundleAnalyzerPlugin(),

    new webpack.ProgressPlugin(),

    // Cleanup dist folder and service worker files before each build.
    new CleanWebpackPlugin(),

    // Shim the 'process' global variable used by node.js modules such as 'path',
    // which is also shimmed by the 'path-browserify' module.
    // See resolve.fallback.path.
    new webpack.ProvidePlugin({
      process: require.resolve(toolsPath('process/browser'))
    }),

    // This is a performance improvement for 'jimp' package.
    new webpack.DefinePlugin({
      'process.browser': 'true'
    }),

    // Create a sitemap.xml file.
    // Automatically update lastmod to date of build.
    new SitemapPlugin({
      base:  url, 
      paths: routes, 
      options: {
        lastmod:  true, // Use the data of the last build for all routes.
        skipgzip: true  // Firebase gzips all files.
      }
    }),

    // Pass a stubbed version of service worker file to dev server.
    new CopyWebpackPlugin({
      patterns: [{
        from: path.resolve('src/images'), 
        to:   'images'
      }, {
        from: path.resolve('src/robots.txt'), 
        to:   'robots.txt'
      }, {
        from: path.resolve('node_modules/@longlost/app-core/app-service-worker.js'), 
        to:   'app-service-worker.js'
      }, {
        from: path.resolve('src/app-service-worker-custom.js'), 
        to:   'app-service-worker-custom.js'
      }]
    }),

    new HtmlWebpackPlugin({

      minify: {
        collapseWhitespace: true,
        minifyCSS:          true,
        minifyJS:           true,
        removeComments:     true,
        useShortDoctype:    true
      },

      scriptLoading: 'defer',

      // Load a custom template.
      template: path.resolve('src/index.ejs'), 

      // Fixes an issue with workbox-webpack-plugin not updating its revision number
      // for index.html. This lead to the service worker serving outdated previously
      // precached files even after the refresh prompt after a new deployment. 
      // Exposes the 'webpack' variable to index.ejs
      templateParameters: compilation => ({
        ...webpackConfig,
        webpack: compilation.getStats().toJson()
      })
    }),

    // Create a service worker.
    new WorkboxPlugin.GenerateSW({
      cacheId,
      clientsClaim: true,

      // Clean caches from older versions of Workbox.
      cleanupOutdatedCaches: true,

      // Do NOT use path.resolve here.
      importScripts: [
        'app-service-worker.js', 
        'app-service-worker-custom.js'
      ], 

      // False because user is prompted to refresh. 
      // That is when we call skipWaiting() in auto
      // generated service-worker.js file.
      skipWaiting:      false,
      navigateFallback: './index.html',

      // Allow Firebase api to bypass sw.
      navigateFallbackAllowlist: [/^(?!\/__)/], 

      runtimeCaching: [{

        // Cache Firebase Storage image thumbnail files.
        urlPattern: new RegExp('^https://storage\\.googleapis\\.com/.*thumb_'), 

        // Serve quickly from cache then update from the network.
        handler: 'StaleWhileRevalidate', 
        options: {

          // Use a custom cache name.
          cacheName: 'runtime-thumbnails',

          // This setting is VERY IMPORTANT for app-file-system when
          // handling images!
          //
          // By default, 'StaleWhileRevalidate' allows opaque responses - status === 0.
          // We do not want to cache those as Safari and Firefox refuse
          // to load them, and they taint canvas elements.
          cacheableResponse: {
            statuses: [200]
          },

          // Only cache 50 thumbnail images.
          expiration: {
            maxEntries: 50
          }
        }
      }]
    }), 

    new FaviconsWebpackPlugin({

      // Your source logo.
      logo: path.resolve('src/images/manifest/icon.png'),

      // Enable caching and optionally specify the path to store cached data.
      // Note: disabling caching may increase build times considerably.
      cache: true,

      // The prefix for all image files (might be a folder or a name).
      prefix: 'icons-[contenthash]/',
      
      // Inject the html into the html-webpack-plugin.
      inject: true,

      // See https://github.com/haydenbleasel/favicons#usage
      favicons: {
        appDescription:       description,
        appName:              name,
        appShortName:         short_name,
        appleStatusBarStyle: 'black-translucent', // 'black-translucent', 'black' or 'default'
        background:           background_color,
        developerName, // Your (or your developer's) name. `string`
        developerURL,  // Your (or your developer's) URL. `string`
        display,
        manifestRelativePaths: true,
        orientation: 'any', // MUST be set to 'any' to allow Chrome to rotate screen.
        start_url:   '/',
        theme_color,
        version, // Your application's version string. `string`

        // Platform icons that are set to false have webapp manifest icon support.
        icons: {

          // 'android' MUST be set to true in order to create a manifest.json. 
          android: true,  // Android homescreen icon.

          // Apple options set to 'false' since Safari supports manifest.json.
          appleIcon:    false, // Apple touch icons.
          appleStartup: false, // Apple startup images.

          favicons: true,  // Create regular favicons.

          // The following platforms/browsers are not targeted for full support.
          windows: false, // Windows 8 tile icons.
          yandex:  false  // Yandex browser icon.
        }
      }
    }),

    new BrowserSyncPlugin({
      host: 'localhost',
      port: 8080,
      server: {
        baseDir:    path.resolve('dist'), 
        middleware: [HistoryApiFallback()]
      }
    }),

    new WebpackBuildNotifierPlugin({
      logo:            path.resolve('src/images/manifest/icon.png'),
      sound:          'Purr',
      suppressWarning: true,      
      title:           short_name
    })
  ]
};
