/**
 * @module exif
 * @requires utils
 */
// detect JPEG images with EXIF metadata
exports.name = "exif";
exports.category = "performance";

var utils = rootRequire("lib/checks/utils");
var ImageHeaders = require("image-headers");
var binary_reader = require("binary-reader");

var self = this;

exports.check = function(checker, browser) {
    var calculatingMinification = 0;
    var calculatedMinification = 0;
    var minifiable = [];

    var entries = [];
    browser.network.on('response', function(req, res, done) {
        if (isJPEG(res)) {
            var chunks = [];
            res.body = new Buffer('');
            res.on('data', function (data) {
                chunks.push(new Buffer(data));
            })
            res.on('end', function() {
                res.body = Buffer.concat(chunks);
                entries.push({request: req, response: res});
                done();
            });
        } else {
            done();
        }
    });

    browser.network.on('done', function(processingDone) {
        var image_headers = new ImageHeaders();
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            calculatingMinification++;
            var image = entry.response.body;
            var i = 0;
            while (i < image.length) {
                image_headers.add_bytes(image.readUInt8(i, true));
                if (image_headers.finished) {
                    break;
                }
                i++;
            }
            image_headers.finish(function(err, headers) {
                var exif_data_length = headers.exif_buffer ? headers.exif_buffer.length : 0;
                reportMinificationSaving(err,
                                         {
                                             url: entry.request.url,
                                             origSize: entry.response.body.length,
                                             diff: exif_data_length
                                         });
                processingDone();
            });
        }

        function reportMinificationSaving(err, minifiableItem) {
            calculatedMinification++;
            // Only report minification savings > 1000 bytes
            if (minifiableItem.diff > 1000) {
                minifiable.push(minifiableItem);
            }
            if (calculatedMinification === calculatingMinification) {
                if (minifiable.length) {
                    minifiable.sort(function(a, b) {
                        return b.diff - a.diff;
                    });
                    var saving = minifiable.reduce(function(prev, a) {
                        return prev + a.diff;
                    }, 0);
                    checker.report("images-could-be-unexified", self.name,
                                   self.category, "warning", {
                                       number: minifiable.length,
                                       minifiable: minifiable,
                                       saving: saving
                                   });
                }
            }
        }
    });


};


function isJPEG(response) {
    var mediaType = utils.mediaTypeName(response.headers['content-type']);
    return (response.statusCode === 200 && mediaType === "image/jpeg")
}

