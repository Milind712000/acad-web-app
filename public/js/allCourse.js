/* eslint-disable no-undef */

$(document).ready(function() {
	const table = $('.dataTable').DataTable({});

	table.on( 'order.dt search.dt', function () {
		table.column(0, {search:'applied', order:'applied'}).nodes().each( function (cell, i) {
			cell.innerHTML = i+1;
		} );
	} ).draw();
});
