//viewport influence skill-responsive of mobile website
//check if the viewport is correctly declared
/**
 * @module meta-viewport
 * @requires selenium-webdriver
 * @requires metaviewport-parser
 */
var webdriver = require('selenium-webdriver');
var metaparser = require('metaviewport-parser');

var wellknownMetaviewportProperties = ["target-densitydpi"];

var self = this;

exports.name = "meta-viewport";
exports.category = "responsive";
exports.check = function(checker, browser) {
    browser.do(function(driver) {
        return driver.findElements(webdriver.By.css('meta[name="viewport"]'))
            .then(function(viewportDecls) {
                // return all the metaviewports found
                webdriver.promise.map(
                    viewportDecls,
                    function(el) {
                        return el.getAttribute("content");
                    }
                ).then(
                    function(metaviewports) {
                        if (metaviewports === undefined ||
                            metaviewports.length === 0) {
                            checker.report("no-viewport-declared",
                                self.name, self.category);
                            return;
                        }
                        if (metaviewports.length > 1) {
                            checker.report("several-viewports-declared",
                                self.name,
                                self.category);
                        }
                        // the last one is the one used
                        var actualViewport = metaviewports[
                            metaviewports.length - 1];
                        var parsedViewport = metaparser.parseMetaViewPortContent(
                            actualViewport);
                        for (var prop in parsedViewport.invalidValues) {
                            checker.report("invalid-viewport-value", 
                                self.name,
                                self.category, {
                                    property: prop,
                                    value: parsedViewport.invalidValues[
                                        prop],
                                    validValues: metaparser.expectedValues[
                                        prop].join(", ")
                                });
                        }
                        if (!parsedViewport.validProperties.width &&
                            !parsedViewport.validProperties[
                                "initial-scale"]) {
                            checker.report("content-viewport-missed",
                                self.name,
                                self.category);
                        } else {
                            if (parsedViewport.validProperties.width) {
                                if (parsedViewport.validProperties.width ===
                                        "device-width" ||
                                    parsedViewport.validProperties.width ===
                                        "device-height") {
                                    //OK
                                    checker.sink.emit('done');
                                } else {
                                    checker.report("hardcoded-viewport-width",
                                        self.name, self.category);
                                }
                            }
                            if (parsedViewport.validProperties[
                                "initial-scale"]) {
                                //OK
                                checker.sink.emit('done');
                            }
                            if (parsedViewport.validProperties[
                                "user-scalable"] === "no") {
                                checker.report("users-are-prevented-to-zoom",
                                    self.name, self.category);
                            }
                            var unknownProperties = Object.keys(
                                parsedViewport.unknownProperties);
                            var nonstandardProperties =
                                unknownProperties.filter(
                                    function(i) {
                                        return wellknownMetaviewportProperties
                                            .indexOf(i) !== -1;
                                    }
                                );
                            var unrecognizedProperties =
                                unknownProperties.filter(
                                    function(i) {
                                        return wellknownMetaviewportProperties
                                            .indexOf(i) === -1;
                                    }
                                );
                            if (nonstandardProperties.length) {
                                checker.report(
                                    "non-standard-viewport-parameter-declared",
                                    self.name, self.category);
                            }
                            if (unrecognizedProperties.length) {
                                checker.report(
                                    "unknow-viewport-parameter-declared",
                                    self.name, self.category);
                            }
                        }

                    }
                );
            });
    });
};