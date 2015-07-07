var express = require('express');
var router = express.Router();
var vobb = require('vobb');

// opon receiving request from client
router.get('/', function(req, res) {

	var loadingReport = new vobb.report();
	loadingReport.count({});
	loadingReport.on('report_count_success', function(total){
		//console.log('counter '+total);
		//loadingReport.load({});
		//loadingReport.on('report_load_success', function(tableData){
			
			// and then send the response
			res.render('report', {
				title: 'VoBB Test Tools Report',
				data: {
					total: total,
					//data: tableData
				}
			});

		//}).on('report_load_error', function(err){
		//	console.log(err);
		//});

	}).on('report_count_error', function(err){
		console.log(err);
	});


	/*
	// get available connection
	mysqlPool.getConnection(function(err, connection){
		if(err) throw err;

		connection.query('SELECT COUNT(*) as totalItem FROM vobb_report', function(err, cRow, cField){
			var data = {};
			data.total = cRow[0]['totalItem'];
			data.data = [];
			
			// execute query
			connection.query('SELECT V.id, V.testedOn , V.ipAddress, V.numberOfLines, V.qualityTest, V.qualityTestResult, V.sipPortTest, V.sipPortMin, V.sipPortMax, V.sipPortTestResult, V.rtpPortTest, V.rtpPortMin, V.rtpPortMax, V.rtpPortTestResult, C.codecName FROM vobb_report V JOIN vobb_codecs C ON C.id = V.codec ORDER BY V.id DESC LIMIT 0,10', function(err, rows, fields){
				for( var i in rows ){

					var newRow = {};
					newRow.on = rows[i]['testedOn'];
					newRow.id = rows[i]['id'];
					newRow.ip = rows[i]['ipAddress'];
					newRow.lines = rows[i]['numberOfLines'];
					newRow.codec = rows[i]['codecName'];

					newRow.qtRaw = rows[i]['qualityTest'];
					newRow.qt = rows[i]['qualityTestResult'];

					newRow.sipRaw = rows[i]['sipPortTest'];
					newRow.sipPortMin = rows[i]['sipPortMin'];
					newRow.sipPortMax = rows[i]['sipPortMax'];
					newRow.sip = rows[i]['sipPortTestResult'];
					
					newRow.rtpRaw = rows[i]['rtpPortTest'];
					newRow.rtpPortMin = rows[i]['rtpPortMin'];
					newRow.rtpPortMax = rows[i]['rtpPortMax'];
					newRow.rtp = rows[i]['rtpPortTestResult'];
				
					data.data.push(newRow);
				}
				// release connection so that it will be available to other user
				connection.release();

				// and then send the response
				res.render('report', {
					title: 'VoBB Test Tools',
					data: data
				});
			});
			//connection.release();
		});
	});
	*/
});

module.exports = router;
