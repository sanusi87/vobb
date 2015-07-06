jQuery(function($){
	var totalItem = $('#pagination').attr('data-total-item'),
	itemPerPage = 10;

	$('#pagination').pagination({
		items: totalItem,
		itemsOnPage: itemPerPage,
		cssStyle: 'light-theme',
		onPageClick: function(page, evt){
			var socketData = {};
			socketData.page = page;
			socket.emit('load_subscribe', socketData);
		}
	});

	socket.on('subscribe_loaded', function(data){
		console.log(data);

		$.each(data, function(i,e){
			console.log(i);
			console.log(e);
		});
	})
});