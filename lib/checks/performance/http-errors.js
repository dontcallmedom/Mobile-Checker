/**
 * @module http-errors
 * @requires url
 */
// detect HTTP errors
exports.name = "http-errors";
exports.category = "performance";

var self = this;

exports.check = function(checker, browser) {
    var urlparse = require("url");

    var entries = [];
    browser.network.on('response', function(req, res, done) {
        res.on('end', function() {
            entries.push({request: req, response: res});
            done();
        });
    });

    browser.network.on('done', function(processingDone) {
        var errors = [];
        var faviconNotFound = false;
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            if (entry.response.statusCode >= 400) {
                var urlObj = urlparse.parse(entry.request.url);
                if (urlObj.path === '/favicon.ico'
                    && entry.response.statusCode === 404) {
                    faviconNotFound = entry.request.url;
                } else {
                    errors.push({
                        url: entry.request.url,
                        status: entry.response.statusCode,
                        statusText: entry.response.statusMessage
                    });
                }
            }
        }
        if (errors.length) {
            checker.report("http-errors-detected", self.name,
                           self.category, "error", {
                               number: errors.length,
                               errors: errors
                           });
        }
        if (faviconNotFound) {
            checker.report("favicon", self.name, self.category, "warning", {
                url: faviconNotFound
            });
        }
        processingDone();
    });
};
