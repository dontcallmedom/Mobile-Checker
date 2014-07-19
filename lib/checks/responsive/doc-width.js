//check width of document (DOM)
exports.name = "doc-width";
exports.category = "responsive";
exports.check = function (checker) {
	var sink = checker.sink;
	console.log(sink);
	if (checker.reporting.analytics.docWidth > checker.profile.config.width) {
		sink.emit('err', checker.l10n.message(checker.options.lang, this.category, this.name, "toolarge"));
		sink.emit('done');

	} else {
		sink.emit('ok', checker.l10n.message(checker.options.lang, this.category, this.name, "ok"));
		sink.emit('done');
	}
}
