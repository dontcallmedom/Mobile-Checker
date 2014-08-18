var filternet = require('filternet');

var sslCerts = {
   '*.github.com': ['stargithub.key', 'stargithub.crt']
};

var myProxy = filternet.createProxyServer(/*{
   sslCerts: sslCerts,
   transSslPort: 8129 // enable transparent ssl proxy
}*/);

myProxy.on("shouldInterceptResponseContent", function(response, callback) {
    callback(true);
});

myProxy.on("interceptResponseContent", function (buffer, responseObject, isSsl, charset, callback) {
   console.log(responseObject);
   console.log(buffer.length);
  // console.log(buffer.toString('utf8'));
   callback(buffer);
});

myProxy.on('error', function (error, locationInfo) {
    console.log(locationInfo);
    console.log(error.stack);
});