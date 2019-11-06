/* eslint-disable no-undef */
var settings = {
	'async': true,
	'crossDomain': true,
	'url': 'http://localhost:3000/edit/deleteArchive',
	'method': 'POST',
	'headers': {
		'content-type': 'application/x-www-form-urlencoded',
		'cache-control': 'no-cache',
		'postman-token': '4ad98bb8-c007-340a-058d-e9a420120b00'
	},
	'data': {
		'objID': '5dc0953ec40de353f3e4cc45'
	}
};

const sendPost = (url, objID) => {
	settings.url = url;
	settings.data.objID = objID;
	$.ajax(settings).done(function (response) {
		console.log('Delete Successful');
	});
};

$(document).ready(function() {
	const table = $('.dataTable').DataTable({
		dom: '<"row"<"col-sm-12 col-md-2"B><"col-sm-12 col-md-4"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-6"i><"col-sm-12 col-md-6"p>>',
		buttons: [
			{
				extend : 'collection',
				text : 'Menu',
				buttons : [
					{
						extend : 'columnToggle',
						text: 'Bulk Delete',
						columns: '.deleteCol'
					},
					{
						extend : 'pdf',
						text : 'Export to PDF'
					},
					{
						extend : 'excel',
						text : 'Export to EXCEL'
					}
				]
			}
		],
		columnDefs: [
			{
				'targets': ['deleteCol'],
				'visible': false,
				'searchable': false
			}
		]
	});

	table.on( 'order.dt search.dt', function () {
		table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
			cell.innerHTML = i+1;
		} );
	} ).draw();

	$('.dataTable tbody').on( 'click', '.delete-btn', function () {
		$(this).parents('tr').addClass('delThisRow');
		sendPost($(this).attr('delres'), $(this).attr('objID') );
		table.row('.delThisRow').remove().draw( false );
	} );

});
