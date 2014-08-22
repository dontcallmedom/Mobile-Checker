// detect redirects
exports.name = "redirects";
exports.category = "performance";

var urlparse = require("url");
var domainNameParser = require("effective-domain-name-parser");

var self = this;

exports.check = function (checker, browser) {
    var redirectCodes = [301, 302, 303, 307];
    var sink = checker.sink;
    browser.on('har', function (har) {
        if (har && har.log && har.log.entries) {
            var mainPage = har.log.entries[0];
            var urlObj = urlparse.parse(mainPage.request.url);
            // we only check if there is path component; not much point otherwise
            if (urlObj.path.length > 0
                && urlObj.path != '/'
                && urlObj.path != '?') {
                if (redirectCodes.indexOf(mainPage.response.status) !== -1) {
                    var redirectUrlObj = urlparse.parse(mainPage.response.redirectURL)

                    var fromDN = domainNameParser.parse(urlObj.hostname);
                    var toDN = domainNameParser.parse(redirectUrlObj);
                    var hasDifferentSubdomain = fromDN.tld && fromDN.tld === toDN.tld
                        && fromDN.sld && fromDN.sld === toDN.sld
                        && fromDN.subdomain !== toDN.subdomain;
                    if (hasDifferentSubdomain) {
                        if (redirectUrlObj.pathname.length <= 1) {
                            checker.report(sink, "redirect-to-home", self.name, self.category, {from: mainPage.request.url, to: mainPage.response.redirectURL});
                        }
                    }
                }
            }
        }
    });
};
