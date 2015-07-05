var net = require('net');

var port = process.argv[2].replace( /^port=/g, '' );
var address = process.argv[3].replace( /^address=/g, '' );
var packet = process.argv[4].replace( /^packet=/g, '' );

var packetCounter = 0;

var client = net.connect(port, address, function(){
	// 0 send normal packet, 1 send STOP packet
	if( packet == 0 ){
		sendPacket( client ); // most of the time, we will use this one
	}else if( packet == 1 ){
		sendStopPacket( client );
	}
	packetCounter++;
});

client.on('data', function(data) {
	var ndata = data.toString();
	console.log(ndata);
	if( /DONE/ig.test( ndata ) ){
		//console.log('client: RCV done');
		client.end();
	}else{
		// send another packet once received a reply, increment the counter
		if( packetCounter < 3 ){
			sendPacket( client );
			packetCounter++;
		}else{
			// send stop packet once 3 packets has been delivered
			sendStopPacket( client );
		}
	}
});

client.on('end', function() {
	console.log('client: disconnected from server');
});

client.on('error', function(err){
	console.log('tcp client: '+err.toString());
});

function sendPacket( theClient ){
	theClient.write("SEND\n", function(){
		console.log("packetsent!");
	});
}

function sendStopPacket( theClient ){
	theClient.write("DONE\n", function(){
		console.log("packetsent!");
	});
}
