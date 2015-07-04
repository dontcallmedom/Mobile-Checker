var proxyPorts = {};

exports.pickPort = function () {
    // we pick port between 49152 and 65535
    var port ;
    do {
        port = 49152 + Math.floor(Math.random()*(65535-49152));
    } while (proxyPorts[port]);
    proxyPorts[port] = true;

    return port;
}

exports.releasePort = function (port) {
    proxyPorts[port] = false;
}
