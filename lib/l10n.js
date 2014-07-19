var reporting;

var messages = {
	en: {
	//responsive
		//responsive/doc-width
		"responsive.doc-width.toolarge": "The width of the page is larger than an average mobile browser size - this means users will have to pan and zoom both horizontally and vertically."
	,	"responsive.doc-width.ok": ""
		//responsive/meta-viewport
	,	"responsive.meta-viewport.multiple": "More than one viewports are declared in the HTML. Please check your HTML file keep a single meta viewport"
	,	"responsive.meta-viewport.nodecl": "No meta viewport tag declared. The meta viewport tag helps adapt the way Web pages are displayed to mobile screens."
	,	"responsive.meta-viewport.ok": "" //ok
	,	"responsive.meta-viewport.nowidth": "The meta viewport does not declare a width, nor an initial-scale, and thus will not adapt the Web page to mobile screens."
	,	"responsive.meta-viewport.noscale": "The meta viewport does not declare a width, nor an initial-scale, and thus will not adapt the Web page to mobile screens." // dup?
	,	"responsive.meta-viewport.incorrectwidth": "The meta viewport declares an incorrect width."
	,	"responsive.meta-viewport.incorrectscale": "The meta viewport declares an incorrect initial-scale."
	//performance
		//performance/load-speed
	,	"performance.load-speed.veryslow": "The page loads very slowly. Reducing the size of resources sent should help."
	,	"performance.load-speed.slow": "The page loads slowly. Reducing the size of resources sent should help."
	,	"performance.load-speed.ok": ""
		//performance/resources-size
	,	"performance.resources-size.warning": ""
	,	"performance.resources-size.ok": ""
		//performance/blocking-resources
	,	"performance.blocking-resources.err": ""
	,	"performance.blocking-resources.warning": ""
	,	"performance.blocking-resources.ok": ""
		//performance/downloading-fonts
	,	"performance.downloading-fonts.warning": ""
	,	"performance.downloading-fonts.ok": ""
	//security
		//security/SSL
	,	"security.ssl.err": ""
	,	"security.ssl.warning": ""
	,	"security.ssl.ok": ""
	}
}

exports.message = function (lang, category, check, res) {
    if (!messages[lang]) return "No such language: " + lang;
    var l10n = messages[lang][category + "." + check + "." + res];
    if (!l10n) return "No such entry: " + category + "." + check;
    return l10n;
};