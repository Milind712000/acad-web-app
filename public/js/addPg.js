/* eslint-disable no-undef */

$(document).ready( function () {
	$('#searchable-tagSelector').multiSelect({
		selectableHeader: '<input type=\'text\' class=\'search-input\' autocomplete=\'off\' placeholder=\'search\'>',
		selectionHeader: '<input type=\'text\' class=\'search-input\' autocomplete=\'off\' placeholder=\'search\'>',
		selectableFooter: '<div class=\'multiselect-footer\'>UNSELECTED</div>',
		selectionFooter: '<div class=\'multiselect-footer\'>SELECTED</div>',
		afterInit: function(){
			var that = this,
				$selectableSearch = that.$selectableUl.prev(),
				$selectionSearch = that.$selectionUl.prev(),
				selectableSearchString = '#'+that.$container.attr('id')+' .ms-elem-selectable:not(.ms-selected)',
				selectionSearchString = '#'+that.$container.attr('id')+' .ms-elem-selection.ms-selected';
		
			that.qs1 = $selectableSearch.quicksearch(selectableSearchString)
				.on('keydown', function(e){
					if (e.which === 40){
						that.$selectableUl.focus();
						return false;
					}
				});
		
			that.qs2 = $selectionSearch.quicksearch(selectionSearchString)
				.on('keydown', function(e){
					if (e.which == 40){
						that.$selectionUl.focus();
						return false;
					}
				});
		},
		afterSelect: function(){
			this.qs1.cache();
			this.qs2.cache();
		},
		afterDeselect: function(){
			this.qs1.cache();
			this.qs2.cache();
		}
	});
	const currentTagAttr = $('#searchable-tagSelector').attr('currentSelected');
	if(currentTagAttr){
		const currentTags = JSON.parse( currentTagAttr );
		$('#searchable-tagSelector').multiSelect('select', currentTags);
	}
});
