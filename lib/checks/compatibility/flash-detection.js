/**
 * @module flash-detection
 */

var self = this;

exports.name = "flash-detection";
exports.category = "compatibility";
exports.check = function(checker, browser) {

    // TODO: should we detect this at the network level instead?
    browser.do(function flashDetection(driver, done) {
        return driver.findElements(browser.webdriver.By.tagName('script')).
        then(function(scripts) {
            browser.webdriver.promise.map(
                scripts,
                function(el) {
                    return el.getAttribute("src");
                }
            ).then(function(srcs) {
                for (var i = 0; i < srcs.length; i++) {
                    if (srcs[i].indexOf('swfobject.js') !== -1) {
                        checker.report("swfobject-lib-detected",
                            self.name,
                            self.category,
                            "error");
                    }
                }
                done();
            });
        });
    });

    browser.do(function flashDetection2(driver, done) {
        return driver.findElements(browser.webdriver.By.tagName('embed')).
        then(function(embeds) {
            browser.webdriver.promise.map(
                embeds,
                function(el) {
                    return el.getAttribute("src");
                }
            ).then(function(srcs) {
                for (var i = 0; i < srcs.length; i++) {
                    if (srcs[i].indexOf('.swf') !== -1) {
                        checker.report("swf-file-detected",
                            self.name, self.category,
                            "error");
                    }
                }
                done();
            });
        });
    });
};
