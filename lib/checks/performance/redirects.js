/**
 * @module redirects
 * @requires url
 * @requires utils
 */
// detect redirects
exports.name = "redirects";
exports.category = "performance";

var urlparse = require("url");

var utils = rootRequire("lib/checks/utils");

var self = this;

exports.check = function(checker, browser) {
    var redirectCodes = [301, 302, 303, 307];

    var entries = [];
    browser.network.on('response', function(req, res, done) {
        res.on('end', function() {
            entries.push({request: req, response: res});
            done();
        });
    });


    browser.network.on('done', function(processingDone) {
        var redirects = [];
        var mainUrl = entries[0].request.url;
        // we ignore the first entry (the page itself)
        for (var i = 1; i < entries.length; i++) {
            var entry = entries[i];
            if (redirectCodes.indexOf(entry.response.statusCode) !== -1) {
                var redirectURL = urlparse.resolve(entry.request.url, entry.response.headers['location']);
                redirects.push({
                    from: entry.request.url,
                    to: redirectURL
                });
            }
        }
        redirects.sort(function(a, b) {
            return utils.localUrlCompare(mainUrl)(a.from, b.from);
        });
        if (redirects.length) {
            checker.report("redirects-encountered", self.name,
                           self.category, "warning", {
                               number: redirects.length,
                               redirects: redirects
                           });
        } else {
            checker.sink.emit("done");
        }
        processingDone();
    });
};
