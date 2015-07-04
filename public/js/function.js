/* server side requirement */
var socket = io.connect(window.location.protocol+'//'+window.location.host);
var settings = {};
/* end */

// JavaScript Document

var stageW;
var stageH;

//---
var appView = "online"; //-------online / offline ---------//
var qualityResult; 	//-------pass / fail -------------//
var firewallResult; 	//-------pass / fail -------------//

//----testing var----//

var qualityTimer;
var firewallTimer;

var firstTimeTest = "true";

//-------------------//

var currTestStat; //--------quality /firewall / done----------//

var theResultSect;
var endResultStat; //-------success / fail-result / fail-unknown---------------//
var successMOSVal;  //---------mos result values -------------------//
var successResultClass; //--------VeryPoor, Poor, Acceptable, Good, Excellent----------------------------//

var theFormCtnt;

var mainBG;
var upperBG;
var upperBGHdr;

var bgTop;

var theRocket;
var rocketBubble;
var innerRocket;

var rocketH;
var rocketLandPosi = 10;
var rocketTakeOffPosi = 250;
var rocketSkyPosi = 100;

var rocketOriX;
var rocketOriY;
var rocketMoveX;
var rocketMoveY;

var innerRocketOriX;
var innerRocketOriY;
var innerRocketMoveX;
var innerRocketMoveY;

var theFlame;
var flameTimer;
var flameW = 28;
var flameSpeed = 30;
var flameMoveVal = 0;
var flameMaxW = 700;

var bgStr;
var lastInnerCurve;
var lastInnerCurveOffset;
var lastInnerCurveEndPosi;

var landSky;
var landSkyExtra;
var landSkyCurveH = 120;
var landtopGap = 120;
var landPosi;

var rptSky;
var rptSkyH = 1020;
var rptSkyCount;

var skyMidPart;
var skyMidPartOffset;

var moveSkyTimer;

var currLines;
var totalLines;

var currCodec;

var currRTPStart;
var currRTPEnd;

var minRTPVal = 10000;
var maxRTPVal = 20000;

var currFirewall;
var totalFirewall = 2; // SIP+RTP = 2
var successFirewall = true;

var barSect;
var barTopPosi = 100;
var barOutPosi = 800;

var pcntCount;

var totalRtpPort;

var resultSet = {
	'VeryPoor' : {desc: 'Impossible to communicate'},
	'Poor': {desc: 'Nearly impossible to communicate'},
	'Acceptable': {desc: 'Inconsistent call quality or voice/sound clarity'},
	'Good': {desc: 'Clear voice/sound with minor imperfections similar to a mobile phone call quality'},
	'Excellent': {desc: 'Uninterrupted face-to-face conversations or radio reception'},
}
var failSet = {
	'address-existed': 'Multiple test is not permitted.<br />Please try again later.',
	'max-testing-user': 'Opps! We have exceeded the number of concurrent connections.<br />Please try again later.'
};
//---

var titleText = null;
var SIP5060Received = false,
SIP5061Received = false;

jQuery(function($){
	titleText = $(document).find('title').text();

	$('#subscribe-button').click(function(){
		var nextLocation = $(this).attr('href');

		var clicked = socket.emit('subscribe_clicked', {click:true});
		if( clicked ){
			window.location( nextLocation );
		}
		return false;
	});

	initPage();

	/* load configuration */
	socket.on('download_buffer', function(data){
		var receivedBuffer = data.buffer;

		socket.emit('upload_buffer',{
			buffer: receivedBuffer
		});
	});

	socket.on('loaded_settings',function(data){
		//console.log('settings loaded...');
		//console.log(data);
		settings = data;
		totalRtpPort = parseInt( settings.total_rtp_port );

		/* RTP port number */
		var rtpPort = parseInt( settings.rtp_min_port );
		$('#rtp-start-val').val( rtpPort );
		$('#rtp-end-val').val( rtpPort+totalRtpPort );
	});
	/* end loading config */

});


//////////////////////////
var fulltest = false;
var local_address;
var requestList = {};
var interval = setInterval(function(){
	//console.log( local_address );
	if( typeof( local_address ) !== 'undefined' ){
		clearInterval( interval );

		//console.log(local_address);
		// remove extra slash
		local_address = local_address.replace( /[^0-9\.]/g, '' );

		var param = {};
		param.address = local_address;
		socket.emit("check_address", param);
	}
}, 100);

socket.on("checked_address", function(data){
	console.log('checked_address');
	console.log(data);
	if( data.status == "same" ){
		fulltest = true;
		Scanner.fulltest = true;
		//Scanner.serverCreateTimeout = 4000;
	}
});
//////////////////////////


//-----------------------------------//

function initPage(){

	initTextfield();

	initDropdownSelector();

	initTestForm();

	initTooltip();

	initRocket();

	initPageResize();

	initApp();

	//initSectPosi();

	//startAni();
};

//----------sky bg-------------//

function initApp(){

	//---------------

	mainBG = $(".main-bg-hdr");
	upperBG = $(".main-bg-hdr.sky-normal");
	upperBGHdr = upperBG.find(".bg-panel-hdr");

	skyMidPart = $(".main-bg-hdr.sky-normal .sky-part-3");
	skyMidPartOffset = skyMidPart.offset();

	landSky = $(".sky-land-cover");
	theLand = $(".content-sect.landing-sect");

	barSect =  $(".bar-sect");

	theFormCtnt = $(".ctnt-form");

	theResultSect = $(".content-sect.result-sect");

	theFlame = $(".rocket-fire");

	rptSky = $(".sky-rpt-sect");

	//---------------

	landSkyExtra = landSky.height() - landSkyCurveH;
	landPosi = -(landSkyCurveH + landtopGap);
	theLand.css("top", landPosi);

	//-------------

	resetApp();

	//-------------
};

function resetApp(){

	//totalLines = 1;
	endResultStat = "";
	firewallResult = null;
	pcntCount = null;

	var rtpPort = parseInt( settings.rtp_min_port );
	jQuery('#rtp-start-val').val( rtpPort );
	jQuery('#rtp-end-val').val( rtpPort+totalRtpPort );
	totalFirewall = 2;
	successFirewall = true;
	rtptest = {};
	delete( siptest1 );
	delete( siptest2 );

	SIP5060Received = false;
	SIP5061Received = false;
	$('.tab-result.selected').removeClass('selected');
	requestList = {};
	
	theFormCtnt.show();

	landSky.hide();
	barSect.hide();

	stopMoveFlame();
	theFlame.hide();

	theResultSect.hide();

	rptSky.hide();

	rocketStopMove();

	resetFormVal();

	showTextForm(0);

};

//-----------rocket---------------------//

function initRocket(){

	theRocket = $(".time-rocket");
	rocketBubble = $(".time-rocket .rocket-bubble")
	innerRocket = $(".time-rocket .img-rocket");

	rocketH = $(".time-rocket").height();

	innerRocketOriX = innerRocket.css("top");
	innerRocketOriY = innerRocket.css("left");

	rocketBubble.hide();

	setRocketLand();

};

//-----rocket movement----

function rocketMove(){

	if( currTestStat != "done" ){
		var randomPosiX = Math.round(Math.random()*1);
		var randomPosiY = Math.round(Math.random()*1);

		innerRocketMoveX = Math.round(Math.random()*2);
		innerRocketMoveY = Math.round(Math.random()*2);

		if(randomPosiX < 1){
			innerRocketMoveX = -(innerRocketMoveX);
		};

		if(randomPosiY < 1){
			innerRocketMoveY = -(innerRocketMoveY);
		};

		innerRocket.animate({
			left: innerRocketMoveX,
			top: innerRocketMoveY
		}, 10, "easeOutQuint", function(){

			rocketMoveOri();
		});
	}

};

function rocketMoveOri(){

	innerRocket.animate({
		left: innerRocketOriX,
		top: innerRocketOriY
	}, 10, "easeOutQuint", function(){

		rocketMove();
	})

};

function rocketStopMove(){

	innerRocket.finish();

	innerRocket.css("top",innerRocketOriX);
	innerRocket.css("left",innerRocketOriY);
};

//----rocket posi Y---

function setRocketLand(){

	rocketOriY = rocketLandPosi;

	theRocket.css("top", rocketLandPosi);

};

function setRocketFly(){

	rocketOriY = rocketSkyPosi;

	theRocket.css("top", rocketSkyPosi);

};

//----rocket posi X---

function setRocketXPosi(){

	var rocketXPosi = (stageW - 96)*0.5;

	rocketOriX = rocketXPosi;

	theRocket.css("left", rocketXPosi);

};

//-------------rocket flame-------------------//

function startMoveFlame(){
	flameTimer = setInterval(moveRocketFlame,flameSpeed);
};

function stopMoveFlame(){
	clearInterval(flameTimer);
};

function moveRocketFlame(){
	flameMoveVal = flameMoveVal - flameW;

	if(flameMoveVal < -(flameMaxW)){
		flameMoveVal = 0;
	};

	$(".rocket-fire .img-flame").css("left", flameMoveVal);
};

//---------------begin test-----------------------------//
var rtptest = {}
function beginTest(){
	//currCodec
	currRTPStart = parseInt(document.getElementById('rtp-start-val').value);

	var tempMx = parseInt($("#rtp-end-val").val());
	if( isNaN( tempMx ) ){
		currRTPEnd = currRTPStart + totalRtpPort;
		if( currRTPEnd >= maxRTPVal ){
			currRTPEnd = maxRTPVal;
		}
	}else{
		currRTPEnd = tempMx;
	}

	initSectPosi();

	rtptest = {};
	var siptest1 = null;
	var siptest2 = null;

	///////////////////////
	Scanner.minSIP = settings.sip_min_port;
	Scanner.maxSIP = settings.sip_max_port;
	Scanner.minRTP = currRTPStart;
	Scanner.maxRTP = currRTPEnd;
	Scanner.serverCreateTimeout = 1000;
	//Scanner.beginTesting();
	///////////////////////

	//---------

	if(appView == "offline"){

		if(firstTimeTest == "true"){
			firstTimeTest = "";

			//endResultStat = "fail-unknown";
		}else{
			endResultStat = "";
		};

	}else{

		//-------------run this after checking if there's an error, return "fail-unknown" if error, else, return nothing----------//

	};


	if(endResultStat == "fail-unknown"){

		showFailEndScene();
	}else{

		runQualityTest();
	};

	//--------------------

};

//--------restart test------------------//

function restartTest(){
	//------------------//
	rocketBubble.hide();

	theRocket.fadeIn(500);

	theRocket.animate({
		top: rocketLandPosi
	}, 800, "easeOutQuint", function(){

		rocketOriY = rocketLandPosi;
	})

	//-----------------//

	theResultSect.fadeOut(500);

	theLand.animate({
		top: landPosi
	}, 800, "easeOutQuint")

	//-----------------//

	resetApp();

	/* after pressing restart, recheck for number of user */
	setTimeout(function(){
		socket.emit('checkuser');
	},500);

};

//------------------section arrangement---------------------//

function initSectPosi(){

	lastInnerCurve = $(".sky-normal .sky-divide-2");

	upperBG.css("top",0);

	lastInnerCurveOffset = lastInnerCurve.offset();
	lastInnerCurveEndPosi = lastInnerCurveOffset.top + lastInnerCurve.height();

	landSky.show();
	landSky.css("top", landPosi);

	//upperBG.css("top",-(lastInnerCurveEndPosi+landSkyExtra));
};

//---------percentage bubble--------//

function showRocketBubble(){

	pcntCount = 0;

	if(currTestStat == "quality"){
		$(".rocket-bubble-hdr").addClass("quality");
	}else{
		$(".rocket-bubble-hdr").removeClass("quality");
	};

	rocketBubble.show();
	rocketBubble.find(".progress-num").html(pcntCount + "%");

	rocketBubble.css({ transform: "scale(0)" });

	rocketBubble.animate({
		transform: 'scale(1)'
		},300, "easeOutBack", initCountPcnt()
	);

};

function initCountPcnt(){
	if(currTestStat == "quality"){
		//----if online, call quality check function from backend-----//
		/* initiate RTP port test */
		//console.log(currCodec);
		socket.emit('qualitytest', {
			codec: currCodec,
			nooflines: totalLines
		});
	}else if( currTestStat == "firewall" ){
		//----if online, call firewall check function from backend-----//

		if( fulltest ){
			if( currFirewall == 2 ){
				/* initiate RTP port test */
				$(".bar-sect .bar-hdr .bar-progress").attr('class','bar-progress'); /* reset progress bar */
				$(".lvl-desc").html("RTP Port "+currRTPStart);

				checkRTPTestResult();
			}else if( currFirewall == 1 ){
				/* initiate SIP port test */
				$(".lvl-desc").html("SIP Port "+settings.sip_min_port);
				$(".bar-sect .bar-hdr .bar-progress").attr('class','bar-progress'); /* reset progress bar */

				checkSIPTest1Result(settings.sip_min_port);
			}
		}else{
			currTestStat = "done";
		}
	};
}

function countPcnt(){

	if(appView == "offline"){
		pcntCount++;
	}else{
		//-----pass percentage value from backend----//
	}

	if(currTestStat == "firewall"){
		var thePcnt = Math.floor(pcntCount/10);

		$(".bar-sect .bar-hdr .bar-progress").attr('class','bar-progress');
		$(".bar-sect .bar-hdr .bar-progress").addClass("pcnt"+thePcnt+"0");
	};

	if(pcntCount >= 100){
		jQuery(document).find('title').text( titleText );
		pcntCount = 100;

		hideRocketBubble();

		if(currTestStat == "quality"){
			rocketFlyOff(); // start firewall test
		}else{
			showFirewallResult(); // move progress bar out and start next test
		};

	}else{
		jQuery(document).find('title').text( titleText+' | '+pcntCount+'%' );
	};

	var pcntStr = pcntCount + "%";
	rocketBubble.find(".progress-num").html(pcntStr);

};

function hideRocketBubble(){

	rocketBubble.animate({
		transform: 'scale(0)'
		},300,"easeInBack", function() {

			rocketBubble.hide();
	});

};
//-------quality test---------------------//

function runQualityTest(){
	currTestStat = "quality";
	theFormCtnt.fadeOut(500);

	theLand.animate({
		top: 0
	}, 800, "easeOutQuint")

	landSky.animate({
		top: -(landSkyExtra)
	}, 800, "easeOutQuint")

	theRocket.animate({
		top: rocketTakeOffPosi
	}, 800, "easeOutQuint", function(){

		rocketOriY = rocketTakeOffPosi;
		rocketMove();
		showRocketBubble()
	})
};

//---------------rocket flying off-------------------------------//

function rocketFlyOff(){

	currTestStat = fulltest ? "firewall" : "done";

	//---
	upperBG.css("top",-(lastInnerCurveEndPosi+landSkyExtra));

	//---
	theFlame.fadeIn(500);
	startMoveFlame();

	theRocket.animate({
		top: rocketSkyPosi
	}, 800, "easeOutQuint",startMoveBgSky());

};

//--------------move the bg sky---------

function startMoveBgSky(){
	moveSkyTimer = setInterval(moveBgSky, 50);
};

function stopMoveBgSky(){
	clearInterval(moveSkyTimer);
};

function moveBgSky(){
	upperBG.animate({
		top: "+=50"
		}, 50, "linear", function(){
			bgTop =  upperBG.position().top;
			if(bgTop >= -(skyMidPartOffset.top + 20) && currTestStat != "done"){

				stopMoveBgSky();
				startRptSky();

				upperBG.stop(true, true);
				initFirewallTest();
			}else if( bgTop >= 0){
				upperBG.stop(true, true);
				stopMoveBgSky();
				console.log(currTestStat);
				console.log('moveBgSky');
				showEndResult();
			};
		});

	landSky.animate({
		top: "+=50"
		}, 50, "linear"
	);

	theLand.animate({
		top: "+=50"
		}, 50, "linear"
	);

};

//-----repeat sky--------

var rptSkyTop;

function startRptSky(){
	rptSky.show();
	rptSky.css("top", -(rptSkyH));
	rptSkyTop = rptSky.position().top;
	rptSkyCount = setInterval(moveRptSky, 50);
};

function stopRptSky(){
	clearInterval(rptSkyCount);
	rptSky.fadeOut(100);
};

function moveRptSky(){
	rptSkyTop = rptSkyTop + 50;
	if(rptSkyTop >= 0){
		rptSkyTop = -510;
	};
	rptSky.css("top",rptSkyTop)
};

//----------firewalll test------------//

function initFirewallTest(){
	currFirewall = 1;
	resetFirewallTest();
	moveFirewallBarIn();
};

function resetFirewallTest(){
	$(".bar-sect .bar-hdr").removeClass("fail");
	$(".lvl-stat").hide();
	barSect.show();
	barSect.css("top", "-77px");
};


//------------display firewall result-----------

function showFirewallResult(){

	if(firewallResult == "pass"){
		$(".lvl-stat").html("passed!");
	}else{
		$(".bar-sect .bar-hdr").addClass("fail");
		$(".lvl-stat").html("blocked!");
	}

	$(".lvl-stat")
	.show()
	.css({ transform: "scale(0)" })
	.animate({
		transform: 'scale(1)'
		},300, "easeOutBack", delayBarMoveOut()
	);

};
//------------------

var delayBarOutTimer;

function delayBarMoveOut(){
	delayBarOutTimer = setInterval(goDelayBarMoveOut, 1000);
};

function goDelayBarMoveOut(){
	clearInterval(delayBarOutTimer);
	moveFirewallBarOut();
};

//--------------------

function moveFirewallBarIn(){
	barSect.animate({
		top: barTopPosi
		}, 300, "easeOutQuint",function(){
			barSect.stop(true,true);
			startFirewallTest();
	});
};

function moveFirewallBarOut(){
	barSect.animate({
		top: barOutPosi
		}, 300, "easeInSine",function(){
			barSect.stop(true,true);
			
			if( currTestStat != 'done' ){
				nextFirewallTest()
			}
	});
};

function startFirewallTest(){
	pcntCount = 0;
	showRocketBubble();
};

function nextFirewallTest(){
	resetFirewallTest();

	// this line finished firewall test and returned the END RESULT screen
	if( currFirewall == 2 || fulltest == false ){
		currTestStat = "done";
		
		startMoveBgSky();
		stopRptSky();

		//--------------------------------------------------------------
		var s = {};
		s[settings['sip_min_port']] = siptest1;
		s[settings['sip_max_port']] = siptest2;

		socket.emit('testFinished', {
			sipPortMin: settings['sip_min_port'],
			sipPortMax: settings['sip_max_port'],
			sipResult: s,
			rtpPortMin: 0,
			rtpPortMax: 0,
			rtpResult: rtptest
		});
		//--------------------------------------------------------------

	}else if( currFirewall == 1 ){
		moveFirewallBarIn();
		currFirewall ++;
	};
};

function removeFirewallBarClass(){
	var theBar = $(".bar-sect .bar-hdr .bar-progress");
	for (i = 1; i <= 10; i++){
		theBar.removeClass("pcnt"+i+"0");
	};
};

//---------show fail end scene----------//

function showFailEndScene(){
	theRocket.fadeOut(300);
	upperBG.animate({
		top: 0
		}, 500, "easeOutQuint", function() {
			console.log('showFailEndScene');
			showEndResult();
	});

	theLand.animate({
		top: 510
		}, 500, "easeOutQuint"
	);
};

function showEndResult(){
	var resultCtnt = $(".result-sect .ctnt-hdr");
	resultCtnt.hide();

	if( endResultStat != "" ){
		$(".result-sect .ctnt-hdr."+endResultStat).show();
	}

	if(endResultStat == "success"){

		$(".quality-sect-hdr .tab-result").removeClass("selected");

		if(successMOSVal < 2.49){
			successResultClass = "VeryPoor";
		}else if(successMOSVal >= 2.5 && successMOSVal < 3.49){
			successResultClass = "Poor";
		}else if(successMOSVal >= 3.5 && successMOSVal < 3.99){
			successResultClass = "Acceptable";
		}else if(successMOSVal >= 4.0 && successMOSVal < 4.29){
			successResultClass = "Good";
		}else{
			successResultClass = "Excellent";
		}

		$(".quality-sect-hdr .tab-result."+successResultClass).addClass("selected");

		var tempResultClass;

		if(successResultClass == "VeryPoor"){
			tempResultClass = "Very Poor";
		}else{
			tempResultClass = successResultClass;
		}

		$(".ctnt-hdr.success .result-txt").html(tempResultClass);
		$(".ctnt-hdr.success .mos-val").html('&nbsp;'+successMOSVal);
		$(".ctnt-hdr.success").children('.desc').html( '('+resultSet[successResultClass].desc+')' );

		if( !fulltest ){
			// --- populate tooltip content
			$.appendResultTooltip( $('.tab-result.selected'), {
				sipResult: 'Unable to test.',
				rtpResult: 'Unable to test.',
				rtpStart: currRTPStart,
				rtpEnd: currRTPEnd,
			});
			// ---
		}else{
			
			// --- populate tooltip content
			if( $('.tab-result.selected').length == 1 ){
				barSect.hide();
				stopMoveFlame();
				theFlame.hide();
				rocketStopMove();
				
				console.log('start...');
				var sipPortTestResult = '',
				rtpPortTestResult = '';

				if( typeof(siptest1) != 'undefined' && typeof(siptest2) != 'undefined' && siptest1 && siptest2 ){
					sipPortTestResult = 'Ports are opened.';
				}else{
					sipPortTestResult = 'Ports closed/used by other application.';
				}

				if( typeof( rtptest ) != 'undefined' ){
					var allPortsOpened = true;
					console.log('looping result....');
					$.each(rtptest, function(i,e){
						if( allPortsOpened ){
							if( e.a.rcv === true && e.a.send === true && e.v.rcv === true && e.v.send === true ){
								// do nothing
							}else{
								allPortsOpened = false;
							}
						}
					});

					if( allPortsOpened ){
						rtpPortTestResult = 'Ports are opened.';
					}else{
						rtpPortTestResult = 'Ports closed/used by other application.';
					}
				}else{
					rtpPortTestResult = 'Ports closed/used by other application.';
				}

				// console.log( $('.tab-result.selected').length );
				// console.log( $('.tab-result.selected') );
				
				$.appendResultTooltip( $('.tab-result.selected'), {
					sipResult: sipPortTestResult,
					rtpResult: rtpPortTestResult,
					rtpStart: currRTPStart,
					rtpEnd: currRTPEnd,
				});
				// --- populate tooltip content
				
				currTestStat = 'done';
				// barSect.animate({
					// top: barOutPosi
					// }, 300, "easeInSine",function(){
						// barSect.stop(true,true);
				// });
			}
		}

	}else if(endResultStat == "fail-result"){
		successResultClass = "N/A";

		$(".ctnt-hdr.error.fail-result .mos-val").html(successResultClass);
	};

	theResultSect.fadeIn(500);
	theRocket.fadeOut(500);
	theRocket.animate({
		top: -(rocketH)
		}, 500, "easeOutQuint",function(){
			stopMoveFlame();
			theFlame.hide();
			theRocket.stop(true, true);
			theRocket.hide();
			rocketStopMove();
		}
	);
};



//====================================================================//

//--------dropdown selector------------//
function initDropdownSelector(){

	if( $('.customDropdown').length > 0 ) {
		$('.customDropdown').each( function() {
			var d = $(this);
			if( d.parent().attr('class') != 'customDropdownHolder' ) {
				d.wrap('<div class="customDropdownHolder" />')
					.before('<div class="texter">' + d.find('option:selected').text() + '</div>')
					.change(function() {
						$(this).parent().find('.texter').html( $(this).find('option:selected').text() );
					});
				d.parent().width(d.width()-35).wrap('<div class="customDropdownBorder" />');
			}
		});
	}

	$('#total-lines').select2({
		minimumResultsForSearch: -1
	});

	$('#codec-type').select2({
		minimumResultsForSearch: -1
	});

	$("#codec-type").change(function(){
		currCodec = $(this).val();
	})

	$("#total-lines").change(function(){
		totalLines = parseInt($(this).val());
	});

};

//------------------------------//

function resetFormVal(){

	var lineDD = document.getElementById("total-lines");
	var codecDD = document.getElementById("codec-type");

	lineDD.options[0].selected = true;
	codecDD.options[0].selected = true;

	$("#total-lines").parent().find('.texter').html($("#total-lines").find('option:selected').text());
	$("#codec-type").parent().find('.texter').html($("#codec-type").find('option:selected').text());

	totalLines = parseInt( $("#total-lines").val() );
	currCodec = $("#codec-type").val();
};

//----------page resize-------------//

function initPageResize(){

	pageResize();

	$( window ).resize(function() {
		pageResize();
	});

};

function pageResize(){

	stageW = $( window ).width();
	stageH = $( window ).height();

	setRocketXPosi();
};



//-----------form tab-----------------//

var currFormNum;
var currForm;

function initTestForm(){
	currCodec = $( '#codec-type' ).val();
	if($(".select-tab-hdr .select-tab").length > 0){
		currFormNum = 0;
		var theTab = $(".select-tab-hdr .select-tab");
		theTab.click(function(){
			currFormNum = theTab.index(this);
			showTextForm(currFormNum);
		})
		showTextForm(currFormNum);
	};
};

function showTextForm(n){
	currFormNum = n;
	var theTab = $(".select-tab-hdr .select-tab");
	//var theForm = $(".form-hdr");
	theTab.removeClass("selected");
	//theForm.hide();
	theTab.eq(currFormNum).addClass("selected");
	//theForm.eq(currFormNum).show();
	if(currFormNum == 0){
		showFormBasic();
	}else{
		showFormAdvance();
	};
	hideErrorPort();
	hideTooltip();
};

function showFormBasic(){

	currForm = "basic";

	$(".form-hdr").addClass("basic");
	$(".form-panel.advance").hide();
};

function showFormAdvance(){

	currForm = "advance";

	$(".form-hdr").removeClass("basic");
	$(".form-panel.advance").show();
};

//------------text field------------------//
function initTextfield(){

	//$(".textfield").keypress(function(event) {
	$("#rtp-start-val").keypress(function(event) {
		var code = (event.keyCode ? event.keyCode : event.which);
		if (!(
				(code >= 48 && code <= 57) //numbers
				|| (code == 46) //delete
				|| (code == 8) // backspace
			)
			|| (code == 46 && code == 8 && $(this).val().indexOf('.') != -1)
		   )
			event.preventDefault();
	});

	//----------

	$("#rtp-start-val").blur(function(){

		hideErrorPort();

		var tempNum =  parseInt(document.getElementById('rtp-start-val').value);
		if(tempNum < minRTPVal ){
			tempNum = minRTPVal;
			showErrorPort();
		}else{
			if( tempNum > maxRTPVal ){
				tempNum = minRTPVal;
				showErrorPort();
			}
		};

		currRTPStart = tempNum;
		if( tempNum >= maxRTPVal ){
			currRTPEnd = maxRTPVal;
		}else{
			if( tempNum + totalRtpPort > maxRTPVal ){
				currRTPEnd = maxRTPVal;
			}else{
				currRTPEnd = tempNum + totalRtpPort;
			}
		}

		setRtpVal();

	});

	//----------

	currRTPStart = minRTPVal;
	currRTPEnd = minRTPVal + totalRtpPort;

	setRtpVal();

};

function setRtpVal(){

	$("#rtp-start-val").val(currRTPStart);
	//$("#rtp-end-val").val(currRTPEnd);
	$("#rtp-end-val").val(currRTPEnd);

};

//---------error text-------------------

function showErrorPort(){
	$(".landing-sect .form-panel .error-txt").show();
};

function hideErrorPort(){
	$(".landing-sect .form-panel .error-txt").hide();
};

//-----------tooltip---------------------//

function initTooltip(){
	/*
	if($(".icon-hdr .tooltip").length > 0){

		var theInfoIcon = $(".icon-hdr .icon-info");
		var theTooltip = $(".icon-hdr .tooltip");

		theInfoIcon.click(function(){

			var theIndex = theInfoIcon.index(this);

			if (theInfoIcon.eq(theIndex).hasClass("selected")){
				hideTooltip();
			}else{
				showTooltip(theIndex);
			};

		})

		theInfoIcon.mouseover(function(){

			var theIndex = theInfoIcon.index(this);

			showTooltip(theIndex);

		}).mouseleave(function(){

			hideTooltip();

		})

		hideTooltip();
	}
	*/
};


function showTooltip(n){
	/*
	var theInfoIcon = $(".icon-hdr .icon-info");
	var theTooltip = $(".icon-hdr .tooltip");

	hideTooltip();

	theInfoIcon.eq(n).addClass("selected");
	theTooltip.eq(n).show();
	*/
};

function hideTooltip(){
	/*
	if($(".icon-hdr .tooltip").length > 0){

		var theInfoIcon = $(".icon-hdr .icon-info");
		var theTooltip = $(".icon-hdr .tooltip");

		theInfoIcon.removeClass("selected");
		theTooltip.hide();
	}
	*/
};


// counting currently active user, update this event listener
socket.on('userLimit', function(data){
	// if more than 10 people connected, disable the testing button
	if( 10 <= data.currentlyActiveUser ){
		endResultStat = "fail-unknown";
		jQuery('.ctnt-hdr.error.fail-unknown').children('.title').html( failSet['max-testing-user'] );
		beginTest();
	}else{

	}
});

// if a user opens multiple tab/window
socket.on('block',function(data){
	endResultStat = "fail-unknown";
	jQuery('.ctnt-hdr.error.fail-unknown').children('.title').html( failSet[data.reason] );
	beginTest();
});

// if a user opens multiple tab/window
socket.on('unblock',function(data){
	restartTest();
});



// handle each test result for signal test
socket.on('transition_one', function(data){
	var cPercent = parseInt( data.data.percent );
	pcntCount = cPercent.toFixed(0);
	countPcnt();
});

// handle summary of test result for signal test
socket.on('callback', function(data){
	if( data.data.MOS == 'N/A' ){
		endResultStat = "fail-result";
		successFirewall = false;
		currTestStat = "done";
	}else{
		endResultStat = "success";
	}
	successMOSVal = data.data.MOS;
});






/////////////// SIP/TCP
var sipResult = {
	5060: {
		a: { send: false, rcv: false },
		v: { send: false, rcv: false }
	},
	5061: {
		a: { send: false, rcv: false },
		v: { send: false, rcv: false }
	}
};

// START TCP/SIP
function checkSIPTest1Result( SIPport ){
	console.log('check SIP 1');
	console.log( SIPport );
	jQuery(".lvl-desc").html("SIP Port "+SIPport);
	pcntCount = 0;

	socket.emit("prepare_tcp_server", {});
}

socket.on("tcp_server_prepared", function(data){
	console.log("tcp_server_prepared???");
	console.log(data);
	if( data.code == 1 ){
		Scanner.Tcp5060Server();
	}
});

// applet server created
function sipServerCreated( port, status ){
	console.log('sipServerCreated??');
	console.log(status);

	if( port == 5060 ){
		if( status ){
			//Scanner.beginSIPPortTest( settings.sip_min_port );
			// vobb TCP server  ->  applet server
			socket.emit("send_tcp_packet", {port: 5060, address: local_address});
		}else{
			SIPTest1Result(false);
		}
	}else if( port == 5061 ){
		if( status ){
			// vobb TCP server  ->  applet server
			socket.emit("send_tcp_packet", {port: 5061, address: local_address});
		}else{
			SIPTest2Result(false);
		}
	}
}

socket.on("tcp_packet_sent", function(data){
	console.log('vobb: tcp_packet_sent??');
	console.log(data);
	
	if( data.send ){
		setVobbSend( data.port, data.send );
	}
	
	// if( data.send ){
		// sipResult[data.port].v.send = data.send;
		// setAppletSend( data.port );
	// }
	
	if( !data.rcv && !data.send ){
		Scanner.closePort0();
		appletSendResult(data.port, false);
	}
	console.log( sipResult[data.port] );
	
	/*
	// vobb server automatically send STOP signal to stop applet server(5060) from listening
	if( data.port == 5060 ){
		if( data.rcv ){
			sipResult[5060].a.rcv = data.rcv;
		}

		if( data.send ){
			sipResult[5060].v.send = data.send;
		}

		// animate bar
		//var result = sipResult[5060].a.rcv && sipResult[5060].a.send && sipResult[5060].v.rcv && sipResult[5060].v.send;
		//SIPTest1Result( result );

		if( !data.rcv && !data.send ){
			Scanner.closePort0();
			appletSendResult(5060, false);
		}

	}else if( data.port == 5061 ){
		if( data.rcv ){
			sipResult[5061].a.rcv = data.rcv;
		}

		if( data.send ){
			sipResult[5061].v.send = data.send;
		}

		// DONE TCP TEST
		//var result = sipResult[5061].a.rcv && sipResult[5061].a.send && sipResult[5061].v.rcv && sipResult[5061].v.send;
		//SIPTest2Result( result );
		if( !data.rcv && !data.send ){
			Scanner.closePort1();
			appletSendResult(5061, false);
		}
	}
	*/
});

// returned by vobb while "socket.on(tcp_packet_sent") is running
socket.on("tcp_packet_received", function(data){
	console.log('vobb: tcp_packet_received??');
	console.log(data);
	
	setVobbReceive( data.port, data.rcv );
	setAppletSend( data.port, data.send );
	
	// if( SIP5060Received === false && data.port == 5060 ){
		// sipResult[5060].v.send = data.send;
		// SIP5060Received = true;
	// }else if( SIP5061Received === false && data.port == 5061 ){
		// sipResult[5061].v.send = data.send;
		// SIP5061Received = true;
	// }

});

// executed by applet while "socket.on(tcp_packet_sent") is running
function appletSendResult( port, result ){
	console.log('applet: appletSendResult??');
	console.log(port+' -> '+result);
	
	setAppletReceive( port, result );
	//sipResult[port].a.send = result;
	console.log(sipResult[port]);
	
	var oResult = sipResult[port].a.rcv && sipResult[port].a.send && sipResult[port].v.rcv && sipResult[port].v.send;
	
	if( port == 5060 ){
		SIPTest1Result( oResult );
	}else if( port == 5061 ){
		SIPTest2Result( oResult );
	}
}

// returned from applet
function SIPTest1Result( result ){
	console.log('SIPTest1Result');
	console.log(result);
	siptest1 = result ? true : false;

	pcntCount = 50;
	if( siptest1 == false ){
		firewallResult = "fail";
		firewallResultText = 'blocked!';
		$(".bar-sect .bar-hdr").addClass("fail");
	}else{
		firewallResult = "pass";
		firewallResultText = "passed!";
		$(".bar-sect .bar-hdr").removeClass("fail");
	}

	$(".lvl-stat").html(firewallResultText).show().css({ transform: "scale(0)" }).animate({transform: "scale(1)"},300, "easeOutBack");
	countPcnt();

	// test next SIP port
	setTimeout(function(){
		checkSIPTest2Result( settings.sip_max_port );
	}, 500);
}

function checkSIPTest2Result( SIPport ){
	console.log('checkSIPTest2Result');
	console.log( SIPport );
	jQuery(".lvl-desc").html("SIP Port "+SIPport);
	jQuery(".lvl-stat").html("");
	$(".bar-sect .bar-hdr").removeClass("fail");

	//Scanner.beginSIPPortTest( local_address, SIPport );

	// applet set to listen to 5061
	Scanner.Tcp5061Server();
}

function SIPTest2Result( result ){
	console.log(sipResult[5060].a);

	console.log('SIPTest2Result');
	console.log(result);
	siptest2 = result ? true : false;

	pcntCount = 100;
	if( siptest2 == false ){
		firewallResult = "fail";
		firewallResultText = 'blocked!';
		$(".bar-sect .bar-hdr").addClass("fail");
	}else{
		firewallResult = "pass";
		firewallResultText = "passed!";
		$(".bar-sect .bar-hdr").removeClass("fail");
	}

	$(".lvl-stat").html(firewallResultText).show().css({ transform: "scale(0)" }).animate({transform: "scale(1)"},300, "easeOutBack");

	countPcnt();

	socket.emit("terminate_tcp_server", {address: local_address});
}

socket.on("udp_server_terminated", function(resp){
	console.log("udp server terminated?");
	console.log(resp);
});


socket.on("tcp_server_terminated", function(resp){
	console.log("tcp server terminated?");
	console.log(resp);
});

function setVobbReceive(port, status){
	sipResult[port].v.rcv = status;
}
function setVobbSend(port, status){
	sipResult[port].v.send = status;
}
function setAppletReceive(port, status){
	sipResult[port].a.rcv = status;
}
function setAppletSend(port, status){
	sipResult[port].a.send = status;
}
/////////////// SIP







/////////////// RTP
var startingRTP = 0;
var udpServerPrepared = false;
// var vobbReceivedPacket = false;

function checkRTPTestResult(){
	console.log(sipResult[5061].a);
	udpServerPrepared = false;
	startingRTP = currRTPStart;

	console.log("vobb: preparing socket on vobb server...");

	// 1- request server to prepare UDP servers - only once
	socket.emit("prepare_udp_server", {
		port: startingRTP,
		address: local_address
	});
}


socket.on("udp_server_prepared", function( resp ){
	console.log('vobb: udp socket prepared??');
	console.log(resp);

	if( resp.code == 1 && udpServerPrepared == false ){
		udpServerPrepared = true;

		// UDP server successfully started
		//check for local_address
		var itv3 = setInterval(function(){
			if( typeof(local_address) != 'undefined' ){
				clearInterval( itv3 );
				checkUDPPort( startingRTP );
			}
		}, 30);
	}
});


function checkUDPPort( port ){
	// vobbReceivedPacket = false;
	$(".lvl-stat").html('');

	rtptest[port] = {
		a: {send: null, rcv: null},
		v: {send: null, rcv: null}
	};

	jQuery(".lvl-desc").html("RTP Port "+port);

	// 2- request applet to prepare UDP servers - 1 by 1 upon testing
	Scanner.createRTPServer( port );
}

// applet request vobb to send test packet
function udpServerRequestTest( port ){
	console.log( requestList );
	if( typeof( requestList[port] ) == 'undefined' ){
		requestList[port] = true;
		console.log('vobb: try to seng UDP packet to applet server on port ' + port);
		socket.emit("send_udp_packet", {port: port, address: local_address});
		Scanner.sendUDPPacket( port ); // send packet to vobb first, no need to wait for the reply
	}
}

// applet have success/fail to created UDP server?
// if success, then applet will ask vobb to test send a packet to the server:port
function udpServerCreated( port, createStatus, listenStatus ){
	//console.log('applet: saving server creation info..');
	console.log('applet server created: '+port + ' -> '+ createStatus);

	// if applet successfully created UDP server, request vobb server to send packet to applet
	// we might also want to request vobb server to send packet even though the UDP server failed to be created, so that we can test for packet send, or we can assume that a packet can be send from vobb server??

	//rtptest[port].v.send = true;

	if( createStatus ){
		udpServerRequestTest( port );
		// if( listenStatus ){
			// rtptest[port].a.rcv = true;
		// }else{
			// rtptest[port].a.rcv = false;
		// }
	}else{
		// if( typeof( rtptest[port] ) != 'undefined' ){
			// if packet has been received
			// if( rtptest[port].a.rcv == true || vobbReceivedPacket ){
				
			// }else{
				// updateAppletReceiveStatus(port, false);
			// }
		// }
		
		// if applet failed to create packet, asking for vobb to send is a wasted, as applet will not receive it
		updateAppletReceiveStatus(port, false);
		// failed to create UDP server for this port, so there is no need to test for the port
		// rtptest[port].a.rcv = false;
		//rtptest[port].v.send = true; // set by setPortStatus(), returned by applet
		//updateAppletReceiveStatus(port, false);
	}

	// applet: test sending a packet to vobb server
 	// console.log('applet: sending packet to vobb:'+ port);
	//Scanner.beginRTPPortTest( port );
}

// vobb: received from applet
socket.on("udp_packet_sent", function(resp){
	console.log('vobb: UDP packet sent??');
	console.log(resp.text);

	updateVobbSendStatus( resp.port, resp.send );
	//rtptest[resp.port].v.send = resp.send ? true : false; // if vobb packet is sent
	//rtptest[resp.port].v.rcv = resp.rcv ? true : false; // if vobb packet is received at applet ... got response from packet

	// applet: send packet to vobb
	// if record for this port is already exists, the first time the result for this port is returned
	//if( typeof(rtptest[resp.port]) != 'undefined' ){
		//console.log('applet: sending packet to vobb:'+ resp.port);
		//Scanner.beginRTPPortTest( resp.port );
	//}
	
	// we should wait for the packet to arrive before begin counting
	var waitTimer = 0;
	var autoReplyIntv = setInterval(function(){
		console.log('--check type');
		console.log( typeof( rtptest[resp.port] ) );
		console.log('--check result');
		console.log(rtptest[resp.port].v.rcv);
		if( typeof( rtptest[resp.port] ) != 'undefined' && rtptest[resp.port].v.rcv === false ){
			if( waitTimer > 1000 ){
				clearInterval( autoReplyIntv );
				// vobbReceivedPacket = true;
				updateVobbReceiveStatus(resp.port, false); // no packet received
				console.log( 'waitTimer > 1000' );
				startCount( resp );
			}
		}else{
			console.log('--received--');
			clearInterval( autoReplyIntv );
			startCount( resp );
		}
		waitTimer += 100;
	}, 30);
});

socket.on("udp_packet_received", function(msg){
	if( typeof( rtptest[msg.port] ) == 'undefined' ){
		rtptest[msg.port] = {};
	}

	if( typeof( rtptest[msg.port].v ) == 'undefined' ){
		rtptest[msg.port].v = {};
	}
	updateVobbReceiveStatus(msg.port, msg.rcv);
});

// socket.on("udp_rcv_stat", function(stat){
	// console.log(stat);
// });

// if this port able to receive something, it also means that the vobb server also able to send
function setReceiveStatus( port ){
	rtptest[port].a.rcv = true; // 4) applet receive response from vobb
	rtptest[port].a.send = true; // 1) applet send to vobb
	rtptest[port].v.send = true; // 3) vobb send response to applet
	rtptest[port].v.rcv = true; // 2) vobb received from applet
}

// called from inside of Applet
function setPortStatus( port, sent ){
	console.log('finalizing test on port '+port+'...');
	console.log('port='+port+', status='+sent);
	//var response = null;

	// save applet respond
	//rtptest[port].a.send = sent; // if applet packet is sent
	//rtptest[port].v.rcv = received; // if got response from vobb server == vobb server received the packet
	updateAppletSendStatus( port, sent );
}


function javaLoaded(){
	var theApplet = document.getElementById('applet-container');
	theApplet.style.position = 'absolute';
	theApplet.style.top = '0px';
	theApplet.style.left = '0px';
	theApplet.style.zIndex = '-1';

	document.getElementById('begin-button').style.display = 'inline';
}

function startCount( resp ){
	// ---
	pcntCount = ( ( totalRtpPort - Math.abs( currRTPEnd - parseInt(resp.port) ) ) / totalRtpPort ) * 100;
	pcntCount = parseInt( pcntCount ).toFixed(0);

	// if applet failed to send and receive
	if( rtptest[resp.port].a.send == true && rtptest[resp.port].a.rcv == true && rtptest[resp.port].v.send == true && rtptest[resp.port].v.rcv == true ){
		firewallResult = "pass";
		response = "passed!";
		jQuery(".bar-sect .bar-hdr").removeClass("fail");
	}else{
		firewallResult = "fail";
		response = "blocked!";
		jQuery(".bar-sect .bar-hdr").addClass("fail");
	}
	jQuery(".lvl-stat").html(response).show().css({transform: "scale(0)"}).animate({transform: "scale(1)"},300, "easeOutBack");

	// lastly display the percentage
	countPcnt();

	if( startingRTP < currRTPEnd ){
		startingRTP++;

		setTimeout(function(){
			checkUDPPort( startingRTP );
		}, 1000);

	}else{
		console.log('olright');
		var s = {};
		s[settings['sip_min_port']] = siptest1;
		s[settings['sip_max_port']] = siptest2;

		socket.emit('testFinished', {
			sipPortMin: settings['sip_min_port'],
			sipPortMax: settings['sip_max_port'],
			sipResult: s,
			rtpPortMin: currRTPStart,
			rtpPortMax: currRTPEnd,
			rtpResult: rtptest
		});

		// terminate udp server one the test finished
		socket.emit("terminate_udp_server", {
			port: $('#rtp-start-val').val(),
			address: local_address
		});


	}
	// ---
}

/**
list of functions to update VoBB port and Applet port
*/

// 4) this is the last function called after VOBB recevied packet from APPLET
function updateVobbReceiveStatus(port, status){
	if( typeof( rtptest[port] ) == 'undefined' ){
		rtptest[port] = {
			v: {}
		};
	}
	rtptest[port].v.rcv = status;

}

// 1) this function is used by APPLET to request for VOBB to send packet to it
function updateVobbSendStatus(port, status){
	if( typeof( rtptest[port] ) == 'undefined' ){
		rtptest[port] = {
			v: {}
		};
	}
	rtptest[port].v.send = status;
}

// 2) if APPLET received a packet from VOBB, then update
function updateAppletReceiveStatus(port, status){
	if( typeof( rtptest[port] ) == 'undefined' ){
		rtptest[port] = {
			a: {}
		};
	}
	rtptest[port].a.rcv = status;
}

// 3) if APPLET has send a reply to VOBB, then update
function updateAppletSendStatus(port, status){
	if( typeof( rtptest[port] ) == 'undefined' ){
		rtptest[port] = {
			a: {}
		};
	}
	rtptest[port].a.send = status;
}
/* -- end -- */

jQuery.extend({
	/**
	content = {
		sipResult: ...,
		rtpResult: ...,
		rtpStart: ...,
		rtpEnd: ...
	}
	*/
	appendResultTooltip: function( elem, content ){
		// --- populate tooltip content
		var tooltipContent = '<div id="test-result-exp" class="icon-hdr-status"><div class="tooltip status"><div><strong>SIP Port 5060-5061:</strong></div>\
		<div>'+content.sipResult+'</div>\
		<div><strong>RTP Port '+content.rtpStart+'-'+content.rtpEnd+':</strong></div>\
		<div>'+content.rtpResult+'</div></div></div>';

		if( $('#test-result-exp').length == 1 ){
			$('#test-result-exp').remove();
		}

		elem.append(tooltipContent);
	}
});
