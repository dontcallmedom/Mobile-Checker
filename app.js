global.rootRequire = function(name) {
    return require(__dirname + '/' + name);
}

var express = require("express"),
	app = express(),
	http = require('http').Server(app),
	io = require('socket.io')(http),
    util = require("util"),
    Checker = require("./lib/checker").Checker,
    events = require("events"),
    logger  = require('morgan'),
    uuid = require('node-uuid'),
    proc = require('child_process');


var fs = require("fs");
var step;
var checklist = [
    require('./lib/checks/performance/number-requests')
,   require('./lib/checks/performance/redirects')
,   require('./lib/checks/performance/http-errors')
,   require('./lib/checks/performance/compression')
,   require('./lib/checks/responsive/doc-width')
,   require('./lib/checks/responsive/meta-viewport')
,   require('./lib/checks/responsive/m.redirect')
//,   require('./lib/checks/responsive/fonts-size')
,   require('./lib/checks/compatibility/flash-detection')
,   require('./lib/checks/interactions/alert')
];

app.use(logger());
app.use(express.static("public"));

function Sink () {}
util.inherits(Sink, events.EventEmitter);


app.get('/', function(req, res){
    res.sendfile('index.html');
});

io.on('connection', function(socket){
    var address = socket.handshake.address;
    socket.on('check', function(data){
        var sink = new Sink
        ,   checker = new Checker
        ;
        var uid = uuid.v4();
        var screenshot = false;
        sink.on('ok', function(msg){
            socket.emit('ok', msg);
        });
        sink.on('warning', function(msg){
            socket.emit('warning', msg);
        });
        sink.on('err', function(msg){
            socket.emit('err', msg);
        });
        sink.on('screenshot', function(path){
            console.log(path);
            screenshot = true;
            socket.emit('screenshot', path);
        });
        sink.on('done', function(){
            step++;
            console.log('done');
            socket.emit('done', step);
        });
        sink.on('end', function(report){
            socket.emit('end', report);
        });
        socket.on('disconnect', function () {
            io.sockets.emit('user disconnected');
            if(screenshot){
            fs.unlink('public/'+uid+'.png', function (err) {
            if (err) throw err;
                console.log('delete with success');
            });   
            }
            
        });
        socket.emit('start', 3);
        checker.check({
            url : data.url
        ,   events : sink
        ,   sockets : socket
        ,   widthView : data.widthView
        ,   heightView : data.heightView
        ,   profile : data.profile
        ,   checklist : checklist
        ,   ip : address
        ,   id : uid
        ,   lang : "en"
        });
        step = 0;
    }); 
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});