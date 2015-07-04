/**
 * @module compression
 * @requires utils
 */
// detect uncompressed textual resources
exports.name = "compression";
exports.category = "performance";

var utils = rootRequire("lib/checks/utils");

var self = this;

exports.check = function(checker, browser) {
    var calculatingCompression = 0;
    var calculatedCompression = 0;
    var compressable = [];

    var entries = [];
    browser.network.on('response', function(req, res, done) {
        if (isCompressableResponse(res) && !
                    isCompressedResponse(res)) {
            var chunks = [];
            res.body = '';
            res.on('data', function (data) {
                res.body += data;
            })
            res.on('end', function() {
                if (shouldBeCompressedResponse(res)) {
                    entries.push({request: req, response: res});
                }
                done();
            });
        } else {
            done();
        }
    });


    browser.network.on('done', function(processingDone) {
        function reportCompressionSaving(err, compressableItem) {
            calculatedCompression++;
            // Only report compression savings > 1000 bytes
            if (compressableItem.diff > 1000) {
                compressable.push(compressableItem);
            }
            if (calculatedCompression === calculatingCompression) {
                if (compressable.length) {
                    compressable.sort(function(a, b) {
                        return b.diff - a.diff;
                    });
                    var saving = compressable.reduce(function(prev, a) {
                        return prev + a.diff;
                    }, 0);
                    checker.report("resources-could-be-compressed", self.name,
                                   self.category, "warning", {
                                       number: compressable.length,
                                       compressable: compressable,
                                       saving: saving
                                   });
                }
                processingDone();
            }

        }

        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            calculatingCompression++;
            calculateCompressionSaving(entry.request.url, entry.response.body,
                                       reportCompressionSaving);
        }
        if (calculatingCompression === 0) {
            processingDone();
        }
    });
};


function isCompressableResponse(response) {
    var compressableMediaTypes = ['text/html', 'application/json',
        'image/svg+xml', 'text/css',
        'text/javascript', 'application/javascript',
        'text/plain', 'text/xml', 'application/xml'
    ];

    var mediaType = utils.mediaTypeName(response.headers['content-type']);
    return (response.statusCode === 200 && compressableMediaTypes.indexOf(mediaType) !==
        -1);
}

function isCompressedResponse(response) {
    var contentEncoding = response.headers['content-encoding'];
    var transferEncoding = response.headers['transfer-encoding'];
    var hasCompressedContentEncoding = (contentEncoding &&
        (contentEncoding.toLowerCase() === 'gzip' || contentEncoding.toLowerCase() ===
            'deflate')
    );
    var hasCompressedTransferEncoding = (transferEncoding &&
        (transferEncoding.toLowerCase() === 'gzip' || transferEncoding.toLowerCase() ===
            'deflate')
    );
    return hasCompressedTransferEncoding || hasCompressedContentEncoding;
}

function shouldBeCompressedResponse(response) {
    return response.body.length > 512;
}

function calculateCompressionSaving(url, body, cb) {
    var zlib = require("zlib");
    var gzipped = zlib.gzip(body, function(err, buffer) {
        cb(err, {
            url: url,
            origSize: body.length,
            diff: body.length - buffer.length
        });
    });
}
