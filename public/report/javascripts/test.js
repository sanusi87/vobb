jQuery(function($){
	var totalItem = $('#pagination').attr('data-total-item'),
	itemPerPage = 10;

	socket.emit('load_report', {page: 1});

	$('#pagination').pagination({
		items: totalItem,
		itemsOnPage: itemPerPage,
		cssStyle: 'light-theme',
		onPageClick: function(page, evt){
			var socketData = {};
			socketData.page = page;
			socket.emit('load_report', socketData);
		}
	});

	/*********************************
	handle load_report response
	*/
	socket.on('loaded_report', function(data){
		var newTr = '';
		console.log(data);
		if( data.length > 0 ){
			$.each(data, function(i,e){
				var testedOn = moment(e.on);
				var sipRaw = JSON.parse(e.sipRaw),
				sipResult;

				if( sipRaw.result[5060] === true && sipRaw.result[5061] ){
					sipResult = 'Success';
				}else{
					sipResult = 'Fail';
				}

				newTr += '<tr> \
					<td>'+e.ind+'</td> \
					<td>'+e.ip+'</td> \
					<td>'+testedOn.format('DD-MM-YYYY hh:mm:ss')+'</td> \
					<td><span class="label label-success">Codec: '+e.codec+'</span>&nbsp;<span class="label label-success">No. of Lines: '+e.lines+'</span></td> \
					<td>'+(e.qt == 0 ? 'Fail' : 'Success')+'</td> \
					<td><span style="display:none">'+e.qtRaw+'</span><a data-toggle="modal" href="#myModal"><i class="glyphicon glyphicon-list-alt"></i></a></td> \
					<td>'+e.sipPortMin+'</td> \
					<td>'+e.sipPortMax+'</td> \
					<td>'+sipResult+'</td> \
					<td><span style="display:none">'+e.sipRaw+'</span><a data-toggle="modal" href="#myModal"><i class="glyphicon glyphicon-list-alt"></i></a></td> \
					<td>'+e.rtpPortMin+'</td> \
					<td>'+e.rtpPortMax+'</td> \
					<td>'+(e.rtp == 0 ? 'Fail' : 'Success')+'</td> \
					<td><span style="display:none">'+e.rtpRaw+'</span><a data-toggle="modal" href="#rtpResultModal"><i class="glyphicon glyphicon-list-alt"></i></a> \
					</td></tr>';
			});
		}else{

		}

		$('#report-table > tbody').html(newTr);
	});
	/*********************************/

	$('#myModal').on('show.bs.modal',function(evt){
		var t = $(this);
		var testResult = $.parseJSON( $(evt.relatedTarget).prev().text() );

		var read = '';
		if( undefined == testResult.totalPortFail ){
			read += '<div class="row">\
				<div class="col-md-6 col-sm-6 col-xs-12">\
					<div class="input-group input-group-sm"><span class="input-group-addon">MOS</span>\
					<span class="form-control">'+testResult.MOS+'</span></div>\
					<div class="input-group input-group-sm"><span class="input-group-addon">Packet Transmitted</span>\
					<span class="form-control">'+testResult.packetTransmitted+'</span></div>\
					<div class="input-group input-group-sm"><span class="input-group-addon">Packet Received</span>\
					<span class="form-control">'+testResult.packetReceived+'</span></div>\
				</div>\
				<div class="col-md-6 col-sm-6 col-xs-12">\
					<div class="input-group input-group-sm"><span class="input-group-addon">Packet Loss</span>\
					<span class="form-control">'+testResult.packetLoss+'</span></div>\
					<div class="input-group input-group-sm"><span class="input-group-addon">Maximum Latency</span>\
					<span class="form-control">'+testResult.maxLatency+'</span></div>\
					<div class="input-group input-group-sm"><span class="input-group-addon">Average Latency</span>\
					<span class="form-control">'+testResult.avgLatency+'</span></div>\
				</div>\
			</div><hr />\
			<div class="row">\
			<div class="col-md-6 col-sm-6 col-xs-12">\
				<p><strong>Latency</strong></p><ul>';

			$.each(testResult.latency, function(i,e){
				read += '<li>'+e+'</li>';
			});

			read += '</ul></div>\
			<div class="col-md-6 col-sm-6 col-xs-12">\
				<p><strong>Jitter</strong></p><ul>';
			$.each(testResult.jitter, function(i,e){
				read += '<li>'+e+'</li>';
			});
			read += '</ul></div>\
			</div>';

		}else{
			if( testResult.totalPortFail.length > 0 ){
				read += '<p>List of failed port:</p><ul>';
				$.each(testResult.totalPortFail, function(i,e){
					read += '<li>'+e+'</li>';
				});
				read += '</ul>';
			}

			if( testResult.result ){
				read += '<div class="row"><div class="col-md-4 col-sm-4 col-xs-4">SIP Result</div>\
					<div class="col-md-4 col-sm-4 col-xs-4"><div>5060: '+testResult.result[5060]+'</div></div>\
					<div class="col-md-4 col-sm-4 col-xs-4"><div>5061: '+testResult.result[5061]+'</div></div>\
					</div>';
			}
		}

		t.find('#myModalLabel').html( 'SIP Test Result' );
		t.find('.modal-body').html( read );
	});

	$('#rtpResultModal').on('show.bs.modal',function(evt){
		var read = '';
		var t = $(this);
		var testResult = $.parseJSON( $(evt.relatedTarget).prev().text() );

		if( testResult.totalPortFail.length > 0 ){
			read += '<p>List of failed port:</p><ul>';
			$.each(testResult.totalPortFail, function(i,e){
				read += '<li>'+e+'</li>';
			});
			read += '</ul>';
		}

		if( testResult.result ){
			read += '<div class="row">\
				<div class="col-md-4 col-sm-4 col-xs-12"><strong>Port Number</strong></div>\
				<div class="col-md-8 col-sm-8 col-xs-12">\
					<div class="row">\
						<div class="col-md-6 col-sm-6 col-xs-6 text-center"><strong>Applet</strong></div>\
						<div class="col-md-6 col-sm-6 col-xs-6 text-center"><strong>VoBB</strong></div>\
					</div>\
					<div class="row">\
						<div class="col-md-3 col-sm-3 col-xs-3"><i class="glyphicon glyphicon-log-out"></i> Send</div>\
						<div class="col-md-3 col-sm-3 col-xs-3"><i class="glyphicon glyphicon-log-in"></i> Receive</div>\
						<div class="col-md-3 col-sm-3 col-xs-3"><i class="glyphicon glyphicon-log-out"></i> Send</div>\
						<div class="col-md-3 col-sm-3 col-xs-3"><i class="glyphicon glyphicon-log-in"></i> Receive</div>\
					</div>\
				</div>\
			</div><hr class="s1" />';

			$.each(testResult.result, function(i,e){
				console.log(i);
				console.log(e);
				read += '<div class="row'+(i%2==0?' bg-info':'')+'">\
					<div class="col-md-4 col-sm-4 col-xs-12">'+i+'</div>\
					<div class="col-md-8 col-sm-8 col-xs-12">\
						<div class="row">\
							<div class="col-md-3 col-sm-3 col-xs-3">'+e.a.send+'</div>\
							<div class="col-md-3 col-sm-3 col-xs-3">'+e.a.rcv+'</div>\
							<div class="col-md-3 col-sm-3 col-xs-3">'+e.v.send+'</div>\
							<div class="col-md-3 col-sm-3 col-xs-3">'+e.v.rcv+'</div>\
						</div>\
					</div>\
				</div>';
			});
		}

		t.find('#rtpResultModalLabel').html( 'RTP Test Result' );
		t.find('.modal-body').html( read );
	});
});
