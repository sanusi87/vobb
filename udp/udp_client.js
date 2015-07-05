var dgram = require('dgram');
var socket = dgram.createSocket('udp4');

var port = process.argv[2].replace( /^port=/g, '' );
var address = process.argv[3].replace( /^address=/g, '' );

var message = new Buffer("VOBB");

socket.send(message, 0, message.length, port, address, function(err){
	if( err ){
		//console.log('udpserv: client send error');
		//console.log(err);
	}else{
		console.log('packet sent to '+address+':'+port);
	}
});

socket.on('message', function(msg, info){
	//console.log('udp client received:');
	console.log(msg.toString());
	//console.log(info);
});

socket.on('close', function(){
	//console.log('udpserv: socket closed.');
});

socket.on('error', function(err){
	//console.log('udpserv: socket error');
	//console.log(err);
});