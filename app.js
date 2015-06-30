var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var vobb = require('vobb');
var sshconn = require('ssh2');
var dgram = require('dgram');
var dgramSocket = dgram.createSocket('udp4'); // UDP client
var net = require('net'); // TCP client

/*******************************/
// this is for the routes
var routes = require('./routes/index');
var report = require('./routes/report');
var settings = require('./routes/settings');
var subscribe = require('./routes/subscribe_click');
var testapplet = require('./routes/test_applet');
/*******************************/

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
//app.use(logger('dev')); /* disabled terminal logger */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

/*******************************/
var os = require('os');
var childProcess = require('child_process').spawn;
var cors = require('cors');
var Connection = require('ssh2');
app.use(cors());
/*******************************/

// this is for the views
app.use('/', routes);
app.use('/report', report);
app.use('/settings', settings);
app.use('/subscribe_click', subscribe);
app.use('/test_applet', testapplet);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

/// error handlers

// development error handler, will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message: err.message,
			error: err
		});
	});
}

// production error handler, no stacktraces leaked to user
app.use(function(err, req, res, next) {
	console.log(err);
	res.status(err.status || 500);
	res.render('error', {
		message: err.message,
		error: {}
	});
});


/*******************************/
// load available codecs first... hmmm...
var loadingCodec = new vobb.codec();
loadingCodec.load();
loadingCodec.on('codec_load_success', function(codecs){

	// to prevent from experiencing any problem later, we only save 10 records into this array
	var testingUser = [];
	var maxConnection = 10;
	var newUser = {};

	// database item
	var dbItem = {};

	// load settings
	var settings = {};

	var server = http.createServer(app);
	io = require('socket.io')(server);

	app.set('port',8000);
	server.listen(app.get('port'));

	// on connection established
	io.on('connection', function(socket){
		var address = {};
		var spawn = null; // process object spawned by child process used to enable and disable UDP servers
		var socketSpawn = null; // process object spawned by child process used to send packet to UDP servers on client

		address.address = socket.request.connection.remoteAddress;
		address.port = socket.request.connection.remotePort;

		// load settings
		var loadingSettings = new vobb.settings();
		loadingSettings.load();
		loadingSettings.on('settings_load_success', function(result){

			////////////// emit to page, need to reconstruct first
			var s = {};
			for( var x in result.settings ){
				s[x] = result.settings[x];
			}
			socket.emit('loaded_settings', s);
			//////////////

			if( undefined == newUser[address.address] ){
				newUser[address.address] = {};
				newUser[address.address].active = [];
				newUser[address.address].backup = [];
				newUser[address.address].active.push( socket.id );
			}else{
				newUser[address.address].backup.push( socket.id );
				//console.log( socket.id );
				//console.log( newUser[address.address] );
				//socket.emit('block', {
				//block: true,
				//	reason: 'address-existed',
				//	at: 'after setting load'
				//});
			}

			if( testingUser.length >= maxConnection ){
				socket.emit('block', {
					block: true,
					reason: 'max-testing-user'
				});
			}

		}).on('settings_load_error', function(error){
			console.log(error);
		});

		var selectedCodec = [];
		var selectedLines = 1;
		var counter = 0;

		var maxDelay = 0;
		var maxLatency = 0;
		var ttlPacketLoss = 0;
		var ttlPacketReceived = 0;
		var ttlLatency = 0;
		var latencies = [];
		var jitters = [];

		var startTimer;
		var buffer;
		var datagramMinPort;

		//-- client Upload
		socket.on( 'upload_buffer', function(data){
			var stopTimer = new Date().getTime();
			var rtt = Math.abs( parseInt( startTimer - stopTimer ) );
			var latency = rtt / 2;

			ttlLatency += latency;

			if( latency > 200 ){
				ttlPacketLoss += 1;
			}else{
				ttlPacketReceived += 1;
				latencies.push( latency );
				maxLatency = latency > maxLatency ? latency : maxLatency;
			}

			if( counter > 0 ){
				var prevLatency = undefined != latencies[counter -1] ? latencies[counter -1] : latency;
				var theDelay = Math.abs( prevLatency - latency );
				jitters.push( theDelay );
				maxDelay = theDelay > maxDelay ? theDelay : maxDelay;
			}

			//-- then restart download if counter != x
			if( counter < 10 ){
				newQualityTest();

				// calculate percentage
				var tdata = {};
				tdata.percent = ( counter / 10 ) * 100;

				// send response
				socket.emit( 'transition_one', {data: tdata} );
			}else{
				// process result
				var ndata = {};
				ndata.packetTransmitted = counter;
				ndata.packetReceived = ttlPacketReceived;
				ndata.packetLoss = ttlPacketLoss;

				if( ttlPacketLoss == counter ){
					// this is 100% packet loss
					ndata.MOS = 'N/A';
				}else{
					avgLatency = parseInt( ttlLatency / latencies.length );
					ndata.maxLatency = maxLatency;
					ndata.avgLatency = avgLatency;
					ndata.latency = latencies;
					ndata.jitter = jitters;

					//MOS calculation
					var delta, R, MOS;

					//using the default values----
					//R=93 for the G.711 codec,
					//R=80 for the G.729a codec and
					//R=86 for iLBC codec.

					if( selectedCodec['name'] == 'G.711' ){
						delta = ( maxDelay - 164.75 ) < 0 ? 0 : 1;
						R = 92.68 - ( 0.1 * maxDelay - 15.9 ) * delta - 22 * Math.log( 1 + 0.2 * ttlPacketLoss );
					}else if( selectedCodec['name'] == 'G.723.1 r63' || selectedCodec['name'] == 'G.723.1 r53' ){
						delta = ( maxDelay - 97.5 ) < 0 ? 0 : 1;
						R = 77.68 - ( 0.1 * maxDelay - 9.18 ) * delta - 33 * Math.log( 1 + 0.15 * ttlPacketLoss );
					}else if( selectedCodec['name'] == 'G.729' ){
						delta = ( maxDelay - 130 ) < 0 ? 0 : 1;
						R = 81.68 - ( 0.1 * maxDelay - 12.43 ) * delta - 31 * Math.log( 1 + 0.15 * ttlPacketLoss );
					}else{
						var EffectiveLatency = ( avgLatency + maxDelay * 2 + 10 );
						R = 93.2 - ( EffectiveLatency < 160 ) ? ( EffectiveLatency / 40 ) : (  ( EffectiveLatency - 120 ) / 10 );
						R = R - ( ttlPacketLoss * 2.5 );
					}

					if( R <= 6.5 ){
						MOS = 1;
					}else if( R > 6.5 && R < 100 ){
						MOS = 1 - ( 7 / 1000 ) * R + ( 7 / 6250 ) * Math.pow( R, 2 ) - ( 7 / 1000000 ) * Math.pow( R, 3 );
						MOS = MOS.toFixed(3);
					}else{
						MOS = 4.5;
					}

					ndata.MOS = parseFloat( MOS ).toFixed(1);
					//end MOS calculation
				}

				// last emit for this function
				socket.emit('callback', {data: ndata});

				// populate database item
				dbItem.qualityTest = JSON.stringify( ndata );
				dbItem.qualityTestResult = ( ttlPacketLoss == 0 ) ? 1 : 0;
			}
		});

		function newQualityTest(){
			startTimer = new Date().getTime();

			//-- client download
			socket.emit('download_buffer',{ buffer: buffer });

			counter++;
		}

		// upon disconnecting
		socket.on('disconnect', function(){
			// remove active user
			if( newUser[address.address].active.indexOf( socket.id ) != -1 ){
				// remove the disconnecting socketID
				newUser[address.address].active.splice( newUser[address.address].active.indexOf( socket.id ), 1 );

				// and unassign the array if both active and backup is empty
				if( newUser[address.address].active.length == 0 && newUser[address.address].backup.length == 0 ){
					delete newUser[address.address];
				}else{
					// if there are backup[s], then take the first backup and load it to active
					if( newUser[address.address].backup.length > 0 ){
						newUser[address.address].active.push( newUser[address.address].backup[0] );

						socket.broadcast.to(newUser[address.address].backup[0]).emit('unblock',{unblock:true});

						// and remove from backup
						newUser[address.address].backup.splice(0,1);
					}
				}
			}

			// remove backup user
			if( undefined != newUser[address.address] && newUser[address.address].backup.indexOf( socket.id ) != -1 ){
				newUser[address.address].backup.splice( newUser[address.address].backup.indexOf( socket.id ), 1 );
			}


			if( testingUser.indexOf( address.address ) != -1 ){
				testingUser.splice( testingUser.indexOf( address.address ), 1 );
			}

			if( spawn != null ){
				console.log('child process 1 '+spawn.pid+' killed!?');
				spawn.kill();
				spawn = null;
			}

			if( socketSpawn != null ){
				console.log('child process 2 '+socketSpawn.pid+' killed!?');
				socketSpawn.kill();
				socketSpawn = null;
			}

		});

		// begin qualityTest
		socket.on('qualitytest', function(data){
			testingUser.push( address.address );

			// if currently testing user is less than maxConnection
			if( testingUser.length < maxConnection ){
				//qualityTest( codecs[data.codec-1], parseInt(data.nooflines) ,address );

				// prepare each variable for the port test
				selectedCodec = codecs[data.codec-1];
				selectedLines = parseInt( data.nooflines );

				dbItem.ipAddress = address.address;
				dbItem.numberOfLines = selectedLines;
				dbItem.codec = data.codec;

				buffer = new Buffer( selectedCodec['packetSize'] * selectedLines );
				//startTimer = new Date().getTime();
				// reset values
				maxDelay = 0;
				maxLatency = 0;
				ttlPacketLoss = 0;
				ttlPacketReceived = 0;
				ttlLatency = 0;
				latencies = [];
				jitters = [];
				counter = 0;

				newQualityTest();
			}else{
				//socket.emit('block', {
				//	block: true,
				//	reason: 'max-testing-user'
				//});
			}
		});

		socket.on('checkuser',function(data){
			if( testingUser.length >= maxConnection ){
				//socket.emit('block', {
				//	block: true,
				//	reason: 'max-testing-user'
				//});
			}else{
				if( newUser[address.address].active[0] == socket.id ){
					// console.log('im active');
				}else{
					// console.log('im waiting...');

					//socket.emit('block', {
					//	block: true,
					//	reason: 'address-existed',
					//	at: 'checkuser'
					//});

				}
			}
		});

		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - REPORT
		socket.on('load_report', function(data){
			var orderBy = 'id DESC';
			var itemPerPage = 10;
			var currentPage = 1;
			var condition = {};

			var loadingReport = new vobb.report(data);
			loadingReport.load(data);
			loadingReport.on('report_load_success', function(tableData){
				socket.emit('loaded_report', tableData);
			}).on('report_load_error', function(err){
				console.log(err);
			});
		});
		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
		socket.on('subscribe_clicked', function(click){
			var subscribe = new vobb.subscribe();
			subscribe.save(address.address);
		});
		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
		socket.on('save_settings', function(data){
			var savingSettings = new vobb.settings();
			savingSettings.save(data);
			savingSettings.on('save_settings_result', function(result){
				socket.emit('settings_saved', {saved:true});
			});
		});
		// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

		socket.on('ping', function(data){
			socket.emit('pong');
		});


		socket.on('testFinished', function(data){
			//console.log('finished');
			//console.log(data);
			var totalSIPPortFail = [];
			var totalRTPPortFail = [];

			// this is SIP
			for( var i in data.sipResult ){
				if( data.sipResult[i] ){

				}else{
					totalSIPPortFail.push(i);
				}
			}

			dbItem.sipPortMin = data.sipPortMin;
			dbItem.sipPortMax = data.sipPortMax;

			dbItem.sipPortTest = JSON.stringify({
				result: data.sipResult,
				totalPortFail: totalSIPPortFail
			});

			if( data.sipResult.length > 0 ){
				dbItem.sipPortTestResult = totalSIPPortFail.length > 0 ? 0 : 1;
			}else{
				dbItem.sipPortTestResult = 0;
			}


			// this is RTP
			for(var i in data.rtpResult){
				if( data.rtpResult[i].a.send && data.rtpResult[i].a.rcv && data.rtpResult[i].v.send && data.rtpResult[i].v.rcv ){

				}else{
					totalRTPPortFail.push(i);
				}
			}

			dbItem.rtpPortMin = data.rtpPortMin;
			dbItem.rtpPortMax = data.rtpPortMax;

			dbItem.rtpPortTest = JSON.stringify({
				result: data.rtpResult,
				totalPortFail: totalRTPPortFail
			});

			if( data.rtpResult.length > 0 ){
				dbItem.rtpPortTestResult = totalRTPPortFail.length > ( data.rtpResult.length / 2 ) ? 0 : 1;
			}else{
				dbItem.rtpPortTestResult = 0;
			}

			dbItem.testedOn = new Date();

			// then save a record
			var report = new vobb.report();
			report.save( dbItem );
			report.on('report_save_success', function(){
				testingUser.splice( testingUser.indexOf( address.address ), 1 );

				// and emit the counting event
				io.sockets.emit( 'userLimit', {
					currentlyTestingUser: testingUser.length
				});
			}).on('report_save_error', function(err){
				console.log(err);
			});
		});


		socket.on("check_address", function(data){
			console.log( "server fetch address" );
			console.log( address.address );

			console.log( "client provide address" );
			console.log( data.address );

			if( data.address == address.address ){
				socket.emit("checked_address", {status:"same"});
			}else{
				//socket.emit("checked_address", {status:"same"});
				socket.emit("checked_address", {status:"different"});
			}
		});

		//--------------------- UDP
		socket.on("prepare_udp_server", function( param ){
			//var ssh = new sshconn();
			var message = {};
			var responseEmitted = false;

			// execute/start child process asynchronously
			spawn = childProcess(vobb.udp.command.process, [
				vobb.udp.command.file,
				'port='+param.port,
				'address='+vobb.ip.private
			]);

			// when all servers has been initialized
			spawn.on('close', function(code){
				console.log('child process 4 closed? code='+code);
			}).on('exit', function(code){
				console.log('child process 4 exit? code='+code);
			}).on('error', function(code){
				console.log('child process 4 error? code='+code);

				message.code = 0;
				message.text = 'Failed to prepare UDP servers!';
				socket.emit("udp_server_prepared", message);
			});

			spawn.stdout.on('data', function(data){
				console.log(data.toString());
				//console.log(/DONE/ig.test(data.toString()));
				if( /DONE/ig.test(data.toString()) && responseEmitted == false ){
					if( !responseEmitted ){
						message.code = 1;
						message.text = 'UDP servers started!';
						socket.emit("udp_server_prepared", message);

						responseEmitted = true;
					}
				}

				// receive from applet
				//if( /APLT/ig.test(data.toString()) ){
				//	socket.emit("udp_rcv_stat", {port: stat:true});
				//}
			});

			spawn.stderr.on('data', function(err){
				console.log('stderr. code='+err);

				message.code = 0;
				message.text = 'Failed to prepare UDP servers!';
				socket.emit("udp_server_prepared", message);
			});
		});

		socket.on("send_udp_packet", function( param ){
			//var ssh = new sshconn();
			var message = {};

			message.rcv = false;
			message.send = false;
			message.port = param.port;

			// udp client sending VOBB message to applet
			var ssp = childProcess(vobb.udp.client.process, { stdio: [ 1, 'pipe' ] }, [
				vobb.udp.client.file,
				'port='+param.port,
				'address='+param.address
			]);

			// when all servers has been initialized
			ssp.on('close', function(code){
				console.log('child process 5 closed? code='+code);
			}).on('exit', function(code){
				console.log('child process 5 exit? code='+code);
			}).on('error', function(code){
				console.log('child process 5 error? code='+code);

				message.code = 0;
				message.text = 'Failed to spawn a child process 5 to send UDP packet!';
				socket.emit("udp_packet_sent", message);
			}).on('message', function(msg){
				console.log('msg received!!'+ msg);
			});

			var replied = false,
			waitTimer = 0;

			// if received a REPLY from applet
			ssp.stdout.on('data', function(data){
				console.log('receiving from child proc 5...');
				console.log('-->'+data.toString());
				message.rcv = true;
				message.send = true;

				var someData = data.toString();
				someData = someData.trim();
				console.log(someData);
				console.log(/APLT/ig.test(someData));

				if( /APLT/ig.test(someData) ){
					message.code = 1;
					message.text = someData;
					replied = true;
					socket.emit("udp_packet_sent", message);
				}
			});

			// if no reply from client applet, for the desinated interval, then send error----------------------------------
			//-------------------- 3000ms = 3s
			var autoReplyIntv = setInterval(function(){
				if( !replied ){
					if( waitTimer > 1500 ){
						clearInterval( autoReplyIntv );
						replied = true;

						message.code = 0;
						message.rcv = false;
						message.text = 'Timeout while waiting for packet!';
						socket.emit("udp_packet_sent", message);
						ssp.kill();
					}
				}else{
					clearInterval( autoReplyIntv );
					ssp.kill();
				}
				waitTimer += 10;
			}, 30);
			//--------------------

			ssp.stderr.on('data', function(err){
				console.log('stderr. code='+err);

				message.code = 0;
				message.text = 'Failed to spawn a child process to send UDP packet!';
				socket.emit("udp_packet_sent", message);
				ssp.kill();
			});
		});

		socket.on("terminate_udp_server", function(param){

			if( spawn != null ){
				console.log('child process '+spawn.pid+' killed!?');

				spawn.kill();
				spawn = null;
			}
		});
		//---------------------

		//--------------------- TCP
		/**
		i dont think TCP 5060/1 server should be started this way,
		because we can automatically start the server on startup,
		there are just 2 ports
		*/
		socket.on("prepare_tcp_server", function( param ){
			var message = {};
			message.code = 1;
			message.text = 'TCP Server started!';

			socket.emit("tcp_server_prepared", message);
		});

		socket.on("send_tcp_packet", function(param){
			var message = {};

			message.rcv = false;
			message.send = false;
			message.port = param.port;

			var spProc = childProcess(vobb.tcp.client.process, [
				vobb.tcp.client.file,
				'port='+param.port,
				'address='+param.address,
				'packet=0'
			]);

			spProc.on('close', function(code){
				console.log('child process 3 closed');
			}).on('exit', function(code){
				console.log('child process 3 exited');

				message.code = 0;
				message.text = 'child process exited';
				socket.emit("tcp_packet_sent", message);
			}).on('error', function(code){
				console.log('child process 3 error');
				message.code = 0;
				message.text = 'Child process failed to spawn!';
				socket.emit("tcp_packet_sent", message);
			});

			spProc.stdout.on('data', function(data){
				console.log('child process stdout');
				console.log(data.toString());

				if( /DONE/ig.test( data.toString() ) ){
					spProc.kill();
				}

				// if you received a reply from somewhere containing RCV message (applet response message),
				// then you have successfully send a packet to the address,
				// and successfully receive a packet from the address
				if( /RCV/ig.test( data.toString() ) ){
					message.rcv = true;
					message.send = true;
					socket.emit("tcp_packet_received", message);
				}
			});

			spProc.stderr.on('data', function(err){
				//console.log('child process stderr');
				//console.log(err.toString());
				//message.code = 0;
				//message.text = 'child process error:'+err.toString();
				//socket.emit("tcp_packet_sent", message);
				spProc.kill();
			})
		});


		/**
		should we terminate the TCP server? no, not this time
		*/
		socket.on("terminate_tcp_server", function(param){
			socket.emit( "tcp_server_terminated", {terminated: true} );
		});
		//---------------------

	});

}).on('codec_load_error', function(error){
	console.log(error);
});
