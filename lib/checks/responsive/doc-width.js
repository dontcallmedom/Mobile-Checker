//check width of document (DOM)
/**
 * @module doc-width
 */
exports.name = "doc-width";
exports.category = "responsive";
exports.check = function(checker, browser) {
    browser.do(function(driver) {
        return driver.executeScript(function() {
            return document.documentElement.clientWidth;
        }).then(function(documentWidth) {
            if (documentWidth > browser.viewport.width) {
                checker.report("doc-width-too-large", self.name,
                    self.category);
            } else {
                checker.sink.emit('done');
            }
        });
    });
};
