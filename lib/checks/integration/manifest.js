// check if there is a JSON manifest
// and if there is, if it is valid
/**
 * @module manifest
 * @requires schema-validator
 */
var SchemaValidator = require('jsonschema').Validator;
var manifestschema = require('./web-manifest.json');
var request = require("request");
var url = require("url");

var self = this;

exports.name = "manifest";
exports.category = "integration";
exports.check = function(checker, browser) {
    function checkUrls(urls, baseUrl) {
        var promises = urls.map(
            function (urlData) {
                var absUrl;
                var deferred = new browser.webdriver.promise.Deferred();
                var urlRef = urlData.url;
                var type = urlData.type;
                try {
                    absUrl = url.resolve(baseUrl, urlRef);
                } catch (e) {
                    checker.report("invalidurl_property", self.name,
                                   self.category, "warning", {
                                       manifest: baseUrl,
                                       property: type,
                                       url: urlRef,
                                       error: e.name
                                   });
                    deferred.fulfill();
                    return deferred.promise;
                }
                request(absUrl, function (error, response, body) {
                    console.log(absUrl);
                    if (error) {
                        checker.report("networkerror_property", self.name,
                                       self.category, "warning", {
                                           manifest: baseUrl,
                                           property: type,
                                           url: absUrl,
                                           error: error
                                       });
                        deferred.fulfill();
                        return;
                    }
                    if (response.statusCode >= 400) {
                        checker.report("httperror_property" , self.name,
                                       self.category, "warning", {
                                           manifest: baseUrl,
                                           property: type,
                                           url: absUrl,
                                           error: response.statusCode
                                       });
                        deferred.fulfill();
                        return;
                    }
                    deferred.fulfill();
                });
                return deferred.promise;

            });
        return browser.webdriver.promise.all(promises);
    }


    browser.do(function(driver) {
        return driver.findElements(browser.webdriver.By.css('link[rel="manifest"]'))
            .then(function(manifestLinks) {
                // return all the manifests found
                return browser.webdriver.promise.map(
                    manifestLinks,
                    function(el) {
                        return el.getAttribute("href");
                    }
                )})
            .then(function(manifests) {
                    var manifest = manifests[0];
                    if (manifests.length > 1) {
                        checker.report("multiple-manifests", self.name,
                                       self.category, "warning", {
                                           links: manifests.slice(1)
                                       });
                    }
                    return manifest;
            }).then(function (manifest) {
                var deferred = new browser.webdriver.promise.Deferred();
                if (!manifest) {
                    deferred.fulfill();
                    return deferred;
                }
                request(manifest, function (error, response, body) {
                    if (error) {
                        checker.report("httperror", self.name,
                                       self.category, "warning", {
                                           manifest: manifest,
                                               error: error
                                       });
                        deferred.fulfill();
                        return;
                    }
                    if (response.statusCode >= 400) {
                        checker.report("httperror", self.name,
                                       self.category, "warning", {
                                           manifest: manifest,
                                           httperror: response.statusCode
                                       });
                        deferred.fulfill();
                        return ;
                    }
                    var data;
                    try {
                        data = JSON.parse(body);
                    } catch (e) {
                        checker.report("jsonerror", self.name,
                                       self.category, "warning", {
                                           manifest: manifest,
                                           error: {name: e.name, message: e.message}
                                       });
                        deferred.fulfill();
                        return;
                    }
                    var validator = new SchemaValidator();
                    var check = validator.validate(data, manifestschema);
                    if (check.errors.length > 0) {
                        checker.report("jsonserror", self.name,
                                       self.category, "warning", {
                                           manifest: manifest,
                                           errors: check.errors
                                       });
                        deferred.fulfill();
                        return;
                    }
                    // Verify URLs are dereferencable
                    var urls = [];
                    if (data.start_url) {
                        urls.push({url: data.start_url, type: "start_url"});
                    }
                    data.icons = data.icons || [];
                    data.icons.forEach( function (icon) {
                        if (icon.src) {
                            urls.push({url:icon.src, type:"icon"});
                            // TODO: more tests on icons
                            // e.g. matching their size with sizes property?
                            // ensuring that "typical" sizes are provided?
                        }
                    });
                    deferred = checkUrls(urls, manifest);
                });
                return deferred;
            });
    });
};

