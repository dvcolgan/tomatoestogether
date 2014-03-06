var http = require('http');
var path = require('path');
var express = require('express');
var Encoder = require('node-html-encoder').Encoder;

// var colors = require('colors');

var app = new express();

app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, '/templates'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.bodyParser());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(require('connect-slashes')(false));
app.use(app.router);

if ('development' === app.get('env')) {
    app.use(express.errorHandler());
}

app.get('/', function(req, res) {
    res.sendfile(__dirname + '/templates/index.html');
});

var MAX_MESSAGE_HISTORY = 100
var NICK_MAX_LENGTH = 32

var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(app.get('port'));

// Less logging
io.set('log level', 1);

var encoder = new Encoder('entity');
var messageHistory = [];
var connectedUsers = [];

// TODO: Remove this
waitingUsers = [];

function ensureMessageIsShort(message, size) {
    if (message.length > size) {
        return message.substr(0, size);
    }
    return message;
}

function pushMessage(message) {
    messageHistory.push(message);
    messageHistory.splice(0, messageHistory.length - MAX_MESSAGE_HISTORY);
}

// All of the code in this section is run once for every connected user
io.sockets.on('connection', function(socket) {

    var userinfo = {};
    userinfo.userid = socket.id;
    userinfo.nick = 'guest';
    userinfo.userColor = '#000000';

    // Tomato
    socket.on('tomatoOver', function(data) {
        io.sockets.emit('otherTomatoOver', data);
    });

    // Messages
    socket.on('message', function(message) {
        message.body = ensureMessageIsShort(message.body, 255);
        message.body = encoder.htmlEncode(message.body);
        message.timestamp = new Date();
        message.userid = userinfo.userid;
        pushMessage(message);

        // TODO: Make this client side?
        if (waitingUsers.indexOf(message.nick) === -1) {
            if (message.body.trim().length !== 0) {
                io.sockets.emit('message', message);
                waitingUsers.push(message.nick);
                setTimeout(function() {
                    waitingUsers.splice(waitingUsers.indexOf(message.nick), 1);
                }, 2000);
            }
        }
        else {
            socket.emit('slow-down');
        }
    });


    // Nick
    function checkNick(info) {

        // TODO: Assign nick

        // TODO: conflict with itself        
        //for user in connectedUsers
        //    if user.userid == not info.userid and user.nick == info.nick
        //        info.nick += '_'
        
        //if info.nick.length > NICK_MAX_LENGTH then
        //    info.nick = ensureMessageIsShort(info.nick, NICK_MAX_LENGTH)
        return info.nick;
    }

    // Connection
    connectedUsers.push(userinfo);
    socket.on('disconnect', function() {
        socket.broadcast.emit('user_dis', userinfo);
        connectedUsers.splice(connectedUsers.indexOf(userinfo), 1);
        // console.log '[USER] '.green + "'#{userinfo.nick.underline.cyan}' (#{socket.id}) Disconnected"
    });

    socket.on('users', function() {
        socket.emit('users', connectedUsers);
    });

    // Client Info
    socket.on('myinfo', function() {
        socket.emit('myinfo', userinfo);
    });

    socket.on('setmyinfo', function(info) {
        var oldNick = userinfo.nick;
        var newNick = checkNick(info);

        if (oldNick !== newNick) {
            userinfo.nick = newNick;
            socket.broadcast.emit('notice',
                '<b>' + oldNick + '</b> changed name to <b>' + userinfo.nick + '</b>.'
            );

            // console.log '[INFO] '.green + "'#{oldNick.underline.cyan}' change nick to '#{newNick.underline.cyan}' (#{userinfo.userid})"
            socket.emit('myinfo', userinfo);
        }
    });

    socket.on('identify', function(info) {
        // console.log 'IDENTIFY '.green + JSON.stringify(info)
        userinfo.nick = checkNick(info);
        userinfo.userColor = info.userColor;
        socket.emit('myinfo', userinfo);
        // console.log '[USER] '.green + "'#{userinfo.nick.underline.cyan}' (#{socket.id}) Connected"
    });

    socket.emit('identify', {});
    
    socket.broadcast.emit('user_con', userinfo);
    
    socket.emit('welcome', { status: 'connected', messages: messageHistory });
});
