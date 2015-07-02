/**
 * @module number-requests
 */
var utils = require("../utils.js");


//check number of requests
exports.name = "number-requests";
exports.category = "performance";

var self = this;

exports.check = function(checker, browser) {
    var entries = [];
    browser.network.on('response', function(req, res, done) {
        entries.push({request: req, response: res});
        res.body = "";
        res.on('data', function (data) {
            res.body += data
        })
        res.on('end', function (data) {
            done();
        });
    });

    browser.network.on('done', function(processingDone) {
	if (entries.length) {
	    checker.report("info-number-requests", self.name, self.category, "info", {
		number: entries.length,
                entries: entries.map(
                    function(e) { return { url: e.request.url,
                                           status: e.response.statusCode,
                                           mimeType: e.response.headers['content-type'],
                                           bodySize: e.response.body.length,
                                           time: e.time
                                         };
                                })
	    });
        }
        processingDone();
    });
};
