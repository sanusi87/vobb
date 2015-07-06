var socket = io.connect('http://127.0.0.1:3000');
var settings = {};

jQuery(function($){
	var portNumber = [];

	/*
	load configuration
	*/
	socket.on('loaded_settings',function(data){
		settings = data;

		/*
		RTP port number
		*/ 
		var rtpPort = parseInt( settings.rtp_min_port );
		$('#port-from').val( rtpPort );
		$('#port-to').val( rtpPort+50 );

		portNumber[0] = settings.sip_min_port+'-'+settings.sip_max_port;
		portNumber[1] = rtpPort+'-'+( rtpPort+50 );
	});


	/*
	default port number, first item will probably be changed
	*/
	//var portNumber = ['20-21', '1000-1050'];
	
	$('#codec, #nooflines').select2();
	
	/*
	increment -to post number by 50 for every value added to -from
	*/
	$('#port-from').bind('keyup',function(){
		var newVal = parseInt( $(this).val() );
		$(this).val(newVal);
		
		$('#port-to').val( newVal + 50 );
	});
	
	/*
	upon clicking the show advance button, reveal the hidden testing options
	*/
	$('#show-advance').click(function(){
		var btn = $(this),
		nextElem = btn.parent().prev();
		
		nextElem.slideToggle(function(){
			if( btn.children('i').hasClass('glyphicon-minus') ){
				btn.children('i').removeClass('glyphicon-minus').addClass('glyphicon-plus');
			}else{
				btn.children('i').removeClass('glyphicon-plus').addClass('glyphicon-minus');
			}
		});
	});
	
	/*
	upon clicking the ReRun button
	*/
	$('#re-run').click(function(){
		$(this).addClass('hide');
		$('#main-anchor').removeClass('disabled').find('a').attr('data-toggle','tab').tab('show');
		$('#quality-anchor, #port-anchor').addClass('hide');
		
		$('.panel-body').find('.alert').remove();
	});
	
	/*
	initialize output graph
	*/
	var qualityBar = $('#quality-test').find('.bar').peity('bar',{
		height: 48,
		width: 101
	}),
	values = [];
	
	/*
	initialize variable(array) for the output graph
	*/ 
	var portBar = [],
	val = [];
	
	/*
	initialize output graph
	*/
	portBar[0] = $('#port-test-0').find('.bar').peity('bar',{
		height: 48,
		width: 101
	});
	
	/*
	initialize output graph
	*/
	portBar[1] = $('#port-test-1').find('.bar').peity('bar',{
		height: 48,
		width: 101
	});
	
	/*
	on click/submit, initiate test
	*/
	$('#submit-action').click(function(){
		/*
		reset graph
		*/
		values = [];
		val = [];
		val[0] = [];
		val[1] = [];
		
		/*
		reset MOS value
		*/ 
		$('#mos-score').val('');
		
		/*
		hide advance option section
		*/ 
		$('#show-advance').click();
		
		/*
		display other testing section
		*/ 
		$('#main-anchor').addClass('disabled').find('a').removeAttr('data-toggle');
		$('#quality-anchor').removeClass('hide').find('a').tab('show');
		$('.tab-content').find('.alert').remove();
		
		// then emit
		socket.emit('qualitytest', {
			codec: $('#codec').val(),
			nooflines: $('#nooflines').val()
		});
		
		return false;
	});
	
	// counting currently active user, update this event listener
	socket.on('userLimit', function(data){
		console.log(data);
		
		// if more than 10 people connected, disable the testing button
		if( 10 <= data.currentlyActiveUser ){
			$('#submit-action').attr('disabled','disabled');
		}else{
			$('#submit-action').removeAttr('submit');
		}

		$('#activeUser').text( data.currentlyActiveUser );
		$('#testingUser').text( data.currentlyTestingUser );
	});
	
	// if a user opens multiple tab/window
	socket.on('block',function(data){
		console.log(data);
		$('#submit-action').attr('disabled','disabled');
	});

	// if a user opens multiple tab/window
	socket.on('unblock',function(data){
		console.log(data);
		$('#submit-action').removeAttr('disabled');
	});
	
	// handle each test result for signal test
	socket.on('transition_one', function(data){
		values.push(data.data.latency);
		qualityBar.text(values.join(',')).change();
	});
	
	// handle summary of test result for signal test
	socket.on('callback', function(data){
		$('#mos-score').val(data.data.MOS);
		$('#quality-test').find('.result-con').append('<div class="alert alert-info"> \
		<strong>Quality Test Completed!</strong></div>');
		
		// initiate port test once complete
		setTimeout(function(){
			$('#port-anchor').removeClass('hide').find('a').tab('show');
			
			// we assume each user clicks on "Advance+" button and change the port number
			portNumber[1] = $('#port-from').val()+'-'+$('#port-to').val();
			initPortTest();
		},1000);
		
	});
	//--------------------
	
	// handle each result of port test
	socket.on('transition_0', function(data){
		val[0].push(data.latency);
		if( val[0].length > 15 ){
			val[0].shift();
		}
		portBar[0].text( val[0].join(',') ).change();
	});
	
	// handle each result of port test
	socket.on('transition_1', function(data){
		val[1].push(data.latency);
		if( val[1].length > 15 ){
			val[1].shift();
		}
		portBar[1].text( val[1].join(',') ).change();
	});
	
	// handle the summary of result of port test
	socket.on('complete_0', function(data){
		// whether success of fail
		if( data.success ){
			$('#port-test-0').find('.panel-body .row').append('<div class="alert alert-success"> \
			Port test result: <strong>Success!</strong>.</div>');
		}else{
			$('#port-test-0').find('.panel-body .row').append('<div class="alert alert-danger"> \
			Port test result: <strong>Failed!</strong></div>');
		}
		
		// if fail, we list the fail port numbers
		if( data.failed.length > 0 ){
			var failPorts = $('#port-test-0').find('.failed-port').removeClass('hide').find('.panel-body ul');
			$.each(data.failed, function(j,k){ failPorts.append( '<li>'+k+'</li>' ); });
		}
	});
	
	// handle the summary of result of port test
	socket.on('complete_1', function(data){
		// whether success of fail
		if( data.success ){
			$('#port-test-1').find('.panel-body .row').append('<div class="alert alert-success"> \
			Port test result: <strong>Success!</strong>.</div>');
		}else{
			$('#port-test-1').find('.panel-body .row').append('<div class="alert alert-danger"> \
			Port test result: <strong>Failed!</strong></div>');
		}
		
		// if fail, we list the fail port numbers
		if( data.failed.length > 0 ){
			var failPorts = $('#port-test-1').find('.failed-port').removeClass('hide').find('.panel-body ul');
			$.each(data.failed, function(j,k){ failPorts.append( '<li>'+k+'</li>' ); });
		}
		
		// and show the re-run button
		$('#re-run').removeClass('hide');
	});
	
	
	function initPortTest(){
		$('#port-test').find('.alert').remove();
		$('#port-test').find('.failed-port').addClass('hide').find('.panel-body ul').empty();
		
		$.each( portNumber, function(i,e){
			// set the range of port number to test
			$('#port-test-'+i).find('input.form-control').val( e );
			
			// then emit the event
			socket.emit('porttest_'+i, {
				portnumber: e
			});
		});
	}
	
});
