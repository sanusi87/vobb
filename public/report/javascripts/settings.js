jQuery(function($){
	var theTable = $('#report-table > tbody');

	$('#save-settings').click(function(){
		var submittedVar = {};
		theTable.find('input[type=text], select').each(function(i,e){
			submittedVar[$(e).attr('id')] = $(e).val();
		});
		console.log(submittedVar);
		socket.emit( 'save_settings', submittedVar );
		return false;
	});

	socket.on('settings_saved', function(data){
		console.log(data);
		alert('Saved!');
	});

	var totalItem = $('#pagination').attr('data-total-item'),
	itemPerPage = 10;

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
});