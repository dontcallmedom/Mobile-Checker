var Proxy = require('browsermob-proxy').Proxy;

function run(url, browserWidth, browserHeight, display, cb) {
    var proxy = new Proxy({port: 8080});
    var generate_traffic = function (proxyAddr, done) {
        // Content-Security Policy header to detect mixed content
        var cspReportUrl = 'http://localhost:3000/report';
        var cspRule = "default-src https: 'unsafe-inline' 'unsafe-eval'; report-uri " + cspReportUrl + "; img-src https://* data: ; frame-src https://* about: javascript:";
        // doesn't work due to a bug in browsermob-proxy 
        // cf https://groups.google.com/forum/#!topic/browsermob-proxy/w-xttP8NO_g
        // https://github.com/lightbody/browsermob-proxy/issues/19
        // https://github.com/lightbody/browsermob-proxy/issues/70

        proxy.doReq('POST', '/' + proxyAddr.split(":")[1] + '/interceptor/response', 'response.getRawResponse().addHeader("Content-Security-Policy-Report-Only","' + cspRule + '");', function () {
            startBrowser(url, browserWidth, browserHeight, display, cb, proxyAddr, done);
        });
    };

    proxy.cbHAR({name: url, captureHeaders: true}, generate_traffic, function (err, har) {
        if (err) {
            console.log(err);
        } else {
            try {
                var data = JSON.parse(har);
            } catch (e) {
                console.log(err);
            }
            cb('har', data);
        }
        cb('close');
    });
};

function startBrowser(url, browserWidth, browserHeight, display, cb, proxyAddr, done) {


//Dependencies
var webdriver = require('selenium-webdriver')
,	fs = require('fs')
,	metaparser = require('./metaviewport-parser')
,       chromedriver = require('chromedriver');
;


//send data to node application with console.log('key_name:stdout_key:'+data)
//keys_names (examples) :
//  - resource_requested
//  - resource_received
//  - start
//  - end
//  - ok
//  - warning
//  - err 
//  - time
//  - screenshot
//  - html
//  - css
//  - script
//  - debug
//  - ...
//example : console.log('resource_requested:stdout_key:'+msg);

function setViewPort (driver) {
	var metaTags = new Array();
	var metaNames = new Array();
	var viewports = new Array();
	var contentAttr;
	var renderingData;
	driver.findElements(webdriver.By.css('meta[name="viewport"]')).then(function(viewportDecls){
                // return all the metaviewports found
                webdriver.promise.map(
                    viewportDecls,
                    function (el) {  return el.getAttribute("content");}
                ).then(
                    function (contentAttrs) {
                        cb('metaviewports', contentAttrs);
                        contentAttr = contentAttrs[contentAttrs.length - 1];
                    }
                );
	}).then(function(){
		if(contentAttr) {
			var viewportProps = metaparser.parseMetaViewPortContent(contentAttr);
			renderingData = metaparser.getRenderingDataFromViewport(viewportProps.validProperties, browserWidth, browserHeight, 4, 0.25 );
		} else {
        	renderingData = { zoom: null, width: browserWidth*3, height: browserHeight*3 };
    	        }
    	        driver.manage().window().setSize(renderingData.width, renderingData.height);
	});
}

var chrome = require("selenium-webdriver/chrome");
var proxy = require('selenium-webdriver/proxy');
var capabilities = webdriver.Capabilities.chrome();
var proxyPrefs = proxy.manual({http: proxyAddr, https: proxyAddr});
capabilities.set(webdriver.Capability.PROXY, proxyPrefs);

var chromeservicebuilder = new chrome.ServiceBuilder(chromedriver.path).withEnvironment({DISPLAY:':' + display}).build();
var driver = chrome.createDriver(capabilities, chromeservicebuilder);

var time = Date.now();
driver.get(url).then(function(){
	time = Date.now() - time;
	cb('pageSpeed', time);
}).then(setViewPort(driver));
driver.findElement(webdriver.By.tagName('head')).then(function(head){
	head.getInnerHtml().then(function(innerHtml){
		cb('head', innerHtml);
	});
});
driver.executeScript(function () {
	return document.documentElement.innerHTML; 
}).then(function(html){
	cb('html', html);
});
driver.executeScript(function () {
	return document.documentElement.clientWidth; //document.width not supported by chrome driver or selenium.
}).then(function(width){
	cb('documentWidth', width);
});
var tags = [
	"html"
,	"body"
,	"header"
,	"div"
,	"section"
,	"p"
,	"button"
,	"input"
,	"h1"
,	"h2"
,	"h3"
,	"h4" 
,	"h5"
,	"h6"	
];
var fontSizes = new Array();
var tagFontSize = {
	tagName : new Array ()
,	fontSize : new Array()
,	location : new Array()
};
//for index in tagList
//	get tagElements
//	then for each
//		get CSS font size -> object
//		get name -> object
//		get localisation -> object
//		then push object in array
//	then send to cb object array
for(var index in tags){
	driver.executeScript(function (tag) {
		return document.documentElement.getElementsByTagName(tag);
	}, tags[index]).then(function(tag, index){
		for (var index in tag){
			tag[index].getCssValue("font-size").then(function(ftSize){
				tagFontSize.fontSize.push(ftSize);
			});
			tag[index].getTagName().then(function(tagName){
				tagFontSize.tagName.push(tagName);
			});
			tag[index].getLocation().then(function(location){
				tagFontSize.location.push(location);
			});
		}
	}).then(function(){
		cb('tagFonts', tagFontSize);
	});
}
/*driver.executeScript(function () {
	return document.documentElement.getElementsByTagName('p');
}).then(function(p){
	for (index in p){
		p[index].getCssValue("font-size").then(function(ftSize){
			cb("msg:stdout_key:"+ftSize);
		});
	}
});*/
driver.takeScreenshot().then(function(data){
    var base64Data = data.replace(/^data:image\/png;base64,/,"")
    fs.writeFile("public/screenshot.png", base64Data, 'base64', function(err) {
        if(err) cb('error', err);
    });
}).then(function() {
    driver.quit();
    done();
});
}

exports.run = run;
