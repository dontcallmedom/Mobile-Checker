var webdriver = require('selenium-webdriver');
var metaparser = require('metaviewport-parser');
var fs = require("fs");
var easyimg = require('easyimage');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var uuid = require('node-uuid');

var Browser = function(config) {
    var display, uaHeader, trackNetwork, browsermobProxy, proxy, driver,
    tmpdir, uadir;

    var networkDataGatheringDone = function() {};
    var pendingNetworkDataGathering = 0;
    var self = this;
    var flow = webdriver.promise.controlFlow();
    var driverPromise = new webdriver.promise.Deferred();

    function init() {
        config = config || {};
        self.viewport = {};
        self.width = config.browserWidth || 320;
        self.height = config.browserHeight || 480;
        self.desktopWidth = config.browserDekstopWidth || self.width * 3;
        self.desktopHeight = config.browserDekstopHeight || self.height * 3;
        display = config.displayServer || 0;
        uaHeader = config.uaHeader || "";
        tmpdir = config.tmpdir || "/tmp";
        uadir = tmpdir + "/mobile-checker-" + uuid.v4();
        trackNetwork = config.trackNetwork || false;
        browsermobProxy = config.browsermobProxy || {
            'host': 'localhost',
            'port': 8080
        };
    }

    function setupProxy() {
        var Proxy = require('browsermob-proxy').Proxy;
        proxy = new Proxy({
            port: browsermobProxy.port,
            host: browsermobProxy.host
        });
    }

    function setupBrowser(proxyAddr) {
        var chromedriver = require("chromedriver");
        var chrome = require("selenium-webdriver/chrome");
        var proxy = require('selenium-webdriver/proxy');
        var capabilities = webdriver.Capabilities.chrome();

        if (proxyAddr) {
            var proxyPrefs = proxy.manual({
                http: proxyAddr,
                https: proxyAddr
            });
            capabilities.set(webdriver.Capability.PROXY, proxyPrefs);
        }

        // enabling metaviewport
        var options = new chrome.Options();
        options.addArguments(["--enable-viewport-meta"]);
        options.addArguments(["--user-data-dir=" + uadir]);

        if (uaHeader) {
            options.addArguments(['--user-agent=' + uaHeader]);
        }
        options.addArguments(['--disable-bundled-ppapi-flash']);

        capabilities.merge(options.toCapabilities());

        var chromeservicebuilder = new chrome.ServiceBuilder(chromedriver.path)
            .withEnvironment({
                DISPLAY: ':' + display
            }).build();
        driver = chrome.createDriver(capabilities, chromeservicebuilder);
    }

    function get(url, done) {
        var time = Date.now();
        return driver.get(url).then(function() {
            time = Date.now() - time;
            self.emit('pageSpeed', time);
        }).then(function() {
            return dontGiveUpOnModal(function(d) {
                return setViewPort(d);
            }, driver);
        });
    }

    function reportNetworkTraffic(err, har) {
        var data;
        if (err) {
            self.emit('error', new Error(
                "Failed gathering network traffic: " + err));
            return;
        }
        try {
            data = JSON.parse(har);
        } catch (e) {
            self.emit('error', new Error(
                "Failed to parse network traffic data from proxy"));
            return;
        }
        pendingNetworkDataGathering = EventEmitter.listenerCount(self, 'har');

        self.emit('har', data, finishNetworkTrafficReport);
        if (pendingNetworkDataGathering === 0) {
            self.emit('done');
        }
    }

    function finishNetworkTrafficReport() {
        pendingNetworkDataGathering--;
        if (pendingNetworkDataGathering === 0) {
            self.emit('done');
            pendingNetworkDataGathering = null;
        }
    }

    // dontGiveUp from https://gist.github.com/domenic/2936696
    // we need to protect any code sent to the drivder
    // from UnexpectedAlertOpenError
    // we dismiss alerts 10 times at most
    function dontGiveUpOnModal(f, d, count) {
        if (!count) {
            count = 10;
        }
        return f(d).then(
            undefined, // pass through success
            function(err) {
                if (err.name === "UnexpectedAlertOpenError" && count >
                    0) {
                    // dismiss alert and retry
                    var alert = d.switchTo().alert();
                    alert.getText().then(function(text) {
                        self.emit('alert', text);
                    });
                    return alert.dismiss().then(function() {
                        dontGiveUpOnModal(f, d, count - 1);
                    });
                }
                self.emit('error', err);
                self.close();
            }
        );
    }


    function setViewPort(d) {
        var contentAttr;
        return d.findElements(webdriver.By.css('meta[name="viewport"]')).then(
            function(viewportDecls) {
                // return all the metaviewports found
                webdriver.promise.map(
                    viewportDecls,
                    function(el) {
                        return el.getAttribute("content");
                    }
                ).then(
                    function(contentAttrs) {
                        contentAttr = contentAttrs[contentAttrs.length -
                            1];
                    }
                );
            }).then(function() {
                return driver.executeScript(function() {
                    return document.documentElement.scrollWidth;
                });
            }).then(function(content_width) {
            if (contentAttr) {
                var viewportProps = metaparser.parseMetaViewPortContent(
                    contentAttr);
                self.viewport = metaparser.getRenderingDataFromViewport(
                    viewportProps.validProperties, self.width, self
                    .height, 4, 0.25);
            } else {
                self.viewport = {
                    zoom: null,
                    width: self.desktopWidth,
                    height: self.desktopHeight
                };
            }
            window_width = self.viewport.zoom === null ?
                    Math.max(self.viewport.width, content_width)
                    : self.viewport.width;
            window_height = window_width * (self.height / self.width) + 97;
            return d.manage().window().setSize(
                window_width,
                window_height + 97 //97px for the browser UI
            );
        }).then(function() {
            return d.executeScript(function() {
                // remove scrollbar
                // TODO webkit specific

                var style = document.createElement("style");
                var cssNoScrollbar = document.createTextNode(
                    "::-webkit-scrollbar { width: 0; height: 0;} body { overflow: hidden}"
                );
                style.appendChild(cssNoScrollbar);
                document.getElementsByTagName("head")[0].appendChild(
                    style);
            }).then(driverPromise.fulfill(d));
        });
    }

    this.close = function() {
        return self.do(function(d) {
            networkDataGatheringDone();
            d.quit();
            return webdriver.promise.fulfilled();
        });
    };

    this.open = function(url) {
        if (trackNetwork) {
            setupProxy();
            var setupProxyAndGet = function() {
                return function(proxyAddr, done) {
                    setupBrowser(proxyAddr);
                    networkDataGatheringDone = done;
                    flow.execute(function() {
                        get(url);
                    });
                };
            };
            flow.execute(function() {
                proxy.cbHAR({
                    name: url,
                    captureHeaders: true,
                    captureContent: true
                }, setupProxyAndGet(), reportNetworkTraffic);
            });
        } else {
            setupBrowser();
            return get(url);
        }
    };

    this.do = function(fn) {
        driverPromise.then(function(d) {
            return dontGiveUpOnModal(function() {
                return flow.execute(
                    function() {
                        fn(d);
                    });
            }, d);
        });
    };

    this.takeScreenshot = function(path) {
        return self.do(function(d) {
            d.takeScreenshot().then(function(data) {
                var base64Data = data.replace(
                    /^data:image\/png;base64,/, "");
                fs.writeFile(path, base64Data, 'base64',
                    function(err) {
                        if (err) {
                            self.emit('error', err);
                        } else {
                            // resize the screenshot
                            easyimg.resize({
                                src: path,
                                dst: path,
                                width: self.width,
                                height: self.height
                            })
                                .then(function() {
                                    self.emit('screenshot',
                                        path);
                                }, function(err) {
                                    console.log(err);
                                    self.emit('error', err);
                                });
                        }
                    });
            });
        });
    };

    init();
};

util.inherits(Browser, EventEmitter);

exports.Browser = Browser;
