function ShelfTemplate(className, encodingName) {
	const self = this;
	
	self.className = className;
	self.encodingName = encodingName;
	self.position = { left: null, right: null, top: null, bottom: null };
	self.previousCapsuleData = null;
}

ShelfTemplate.prototype.installShelfTooltip = installShelfTooltip;
ShelfTemplate.prototype.installCapsuleTooltip = installCapsuleTooltip;
ShelfTemplate.prototype.installDragCapsuleBehaviour = installDragCapsuleBehaviour;
ShelfTemplate.prototype.installRemoveButtonBehaviour = installRemoveButtonBehaviour;
ShelfTemplate.prototype.pauseTooltipFor = pauseTooltipFor;

ShelfTemplate.prototype.checkPosition = checkPosition;
ShelfTemplate.prototype.isMouseOnTop = isMouseOnTop;

ShelfTemplate.prototype.highlight = highlight;
ShelfTemplate.prototype.doubleHighlight = doubleHighlight;
ShelfTemplate.prototype.removeHighlight = removeHighlight;
ShelfTemplate.prototype.blink = blink;

ShelfTemplate.prototype.createCapsule = createCapsule;
ShelfTemplate.prototype.removeCapsule = removeCapsule;
ShelfTemplate.prototype.refreshCapsule = refreshCapsule;

ShelfTemplate.prototype.changeCapsuleAttributeType = changeCapsuleAttributeType;
ShelfTemplate.prototype.changeCapsuleAttributeName = changeCapsuleAttributeName;
ShelfTemplate.prototype.changeAggregateOrTimeUnit = changeAggregateOrTimeUnit;
ShelfTemplate.prototype.changeCapsuleAutoGeneratedClass = changeCapsuleAutoGeneratedClass;
ShelfTemplate.prototype.changeCapsuleOriginallyNominalClass = changeCapsuleOriginallyNominalClass;
ShelfTemplate.prototype.adjustAttributeNameWidth = adjustAttributeNameWidth;
ShelfTemplate.prototype.startPreview = startPreview;
ShelfTemplate.prototype.endPreview = endPreview;

ShelfTemplate.prototype.saveState = saveState;
ShelfTemplate.prototype.restoreState = restoreState;
ShelfTemplate.prototype.clearState = clearState;

ShelfTemplate.prototype.getCapsuleData = getCapsuleData;
ShelfTemplate.prototype.storeCapsuleData = storeCapsuleData;
ShelfTemplate.prototype.isEmpty = isEmpty;

function installShelfTooltip() {
	const self = this;

	$(self.className)
		.on('mouseenter', onMouseEnterShelf)
		.on('mouseleave', onMouseLeaveShelf);

	function onMouseEnterShelf() { Tooltip.show(this, -8, -6); }
	function onMouseLeaveShelf() { Tooltip.remove(); }
}

function installCapsuleTooltip() {
	const self = this;
	let capsuleSettingButtonSelector = self.className + ' .capsule .fa-cog';
	let capsuleRemoveButtonSelector = self.className + ' .capsule .fa-times';

	$(capsuleSettingButtonSelector)
		.on('mouseenter', onMouseEnterSettingButton)
		.on('mouseleave', onMouseLeaveButton);
	$(capsuleRemoveButtonSelector)
		.on('mouseenter', onMouseEnterRemoveButton)
		.on('mouseleave', onMouseLeaveButton);

	function onMouseEnterSettingButton() { Tooltip.show(this, 12, -10); }
	function onMouseEnterRemoveButton() { Tooltip.show(this, -3, -10); }
	function onMouseLeaveButton() { Tooltip.remove(); }
}

function installDragCapsuleBehaviour() {
	const self = this;
	let capsuleSelector = self.className + ' .capsule';
	let tempCapsuleDataOnDrag = null; // data is removed from shelf, need a place to store
	let dragBehaviour = d3.drag()
        .on("start", onDragStart)
        .on("drag", onDragging)
        .on("end", onDragEnd);

	d3.selectAll(capsuleSelector)
		.call(dragBehaviour);

	function onDragStart() {
		let isCapsuleOccupied = $(this).hasClass('occupied');
		let clickedSettingButton = $(d3.event.sourceEvent.target).closest('.fa-cog').length > 0;
		let clickedRemoveButton = $(d3.event.sourceEvent.target).closest('.fa-times').length > 0;

		if (!isCapsuleOccupied || clickedSettingButton || clickedRemoveButton)
			return;

		let capsuleContainerEl = $(this).closest('.container')[0];
		let capsuleData = d3.select(capsuleContainerEl).datum();

		let attributeName = capsuleData.attributeName;
		let attributeType = capsuleData.type;
		let attributeAggregateOrTimeUnit = (capsuleData.aggregate != 'none') ? capsuleData.aggregate : ((capsuleData.timeUnit != 'none') ? capsuleData.timeUnit : '');
		let needParenthesis = (attributeAggregateOrTimeUnit === '') ? false : true;
		let isAttrAutoGenerated = capsuleData.isAutoGenerated;
		let isAttrOriginallyNominal = (Database.attributeMetadata[attributeName].type == 'nominal');

		let draggedCapsulePos =  $(this).offset();
		let draggedCapsuleWidth = $(this).width();

		// create draggable capsule
		DraggableCapsule.remove();
		DraggableCapsule.create(isAttrAutoGenerated, isAttrOriginallyNominal);
		DraggableCapsule.moveTopLeftCornerTo(draggedCapsulePos.top - 8, draggedCapsulePos.left - 8);
		DraggableCapsule.changeWidth(draggedCapsuleWidth);
		DraggableCapsule.changeAttributeType(attributeType);
		DraggableCapsule.changeAttributeName(attributeName, needParenthesis);
		DraggableCapsule.changeAggregateOrTimeUnit(attributeAggregateOrTimeUnit);
		DraggableCapsule.adjustAttributeNameWidth();

		// clear capsule and data on shelf and prepare for restore shelf state
		tempCapsuleDataOnDrag = capsuleData;
		Shelves.saveState();
		self.removeCapsule();

		// shelf highlight
		Shelves.highlight();
		FilterShelf.highlight();
		Shelves.checkPosition();
		FilterShelf.checkPosition();

		// others
		PreviewMode.confirm();
		VariableSettingMenu.hide();
		LookAheadSelectMetricMenu.hide();
		Tooltip.remove();
	}

	function onDragging() {
		if (DraggableCapsule.isCreated()) {
			let mouseX = d3.event.sourceEvent.pageX;
			let mouseY = d3.event.sourceEvent.pageY;
			let hoveredShelfName = Shelves.onWhich(mouseX, mouseY);
			let isOnFilterShelf = FilterShelf.isMouseOnTop(mouseX, mouseY);

			FilterShelf.highlight(); // restore highlight
			Shelves.highlight(); // restore highlight
			if (isOnFilterShelf) FilterShelf.doubleHighlight();
			if (hoveredShelfName) Shelf[hoveredShelfName].doubleHighlight();
			DraggableCapsule.moveTo(top = mouseY - 8, left = mouseX - 8);
		}
	}

	function onDragEnd() {
		if (DraggableCapsule.isCreated()) {

			let mouseX = d3.event.sourceEvent.pageX;
			let mouseY = d3.event.sourceEvent.pageY;
			let hoveredShelfName = Shelves.onWhich(mouseX, mouseY);
			let isOnFilterShelf = FilterShelf.isMouseOnTop(mouseX, mouseY);
			let capsuleData = tempCapsuleDataOnDrag;

			let attributeName = capsuleData.attributeName;
			let attributeType = capsuleData.type;	
			let attributeAggregateOrTimeUnit = (capsuleData.aggregate != 'none') ? capsuleData.aggregate : ((capsuleData.timeUnit != 'none') ? capsuleData.timeUnit : '');
			let needParenthesis = (attributeAggregateOrTimeUnit === '') ? false : true;
			let isAttrAutoGenerated = capsuleData.isAutoGenerated;
			let isAttrOriginallyNominal = (Database.attributeMetadata[attributeName].type == 'nominal');

			if (isOnFilterShelf) {
				// remove highlight
				DraggableCapsule.remove();
				Shelves.removeHighlight();
				FilterShelf.removeHighlight();

				// visually add capsule to shelf
				FilterShelf.createFilter(attributeName, attributeType, isAttrAutoGenerated);

				// draw chart using vega-lite
				ShowMe.tryUnlockDensityPlot();
				ShowMe.tryUnlockTrendLines();
				VisualizationPane.showLoader();
				VisualizationPane.allowUpdating();
				VegaliteGenerator.generateSpecification(); // may block vis update and restore state
				VisualizationPane.tryUpdating();

				// look ahead
				LookAheadEventHandler.listenEvent();
			}

			if (hoveredShelfName) {
				// remove highlight
				DraggableCapsule.remove();
				Shelves.removeHighlight();
				FilterShelf.removeHighlight();

				// visually add capsule to shelf
				Shelf[hoveredShelfName].createCapsule(isAttrAutoGenerated, isAttrOriginallyNominal);
				Shelf[hoveredShelfName].installCapsuleTooltip();
				Shelf[hoveredShelfName].installRemoveButtonBehaviour();
				Shelf[hoveredShelfName].installDragCapsuleBehaviour(); // setting button handled in Listener class
				Shelf[hoveredShelfName].pauseTooltipFor(500);
				Shelf[hoveredShelfName].changeCapsuleAttributeType(attributeType);
				Shelf[hoveredShelfName].changeCapsuleAttributeName(attributeName, needParenthesis);
				Shelf[hoveredShelfName].changeAggregateOrTimeUnit(attributeAggregateOrTimeUnit);
				Shelf[hoveredShelfName].adjustAttributeNameWidth();	

				// update data and prepare for restore shelf state
				Shelf[hoveredShelfName].storeCapsuleData(capsuleData);

				// draw chart using vega-lite
				ShowMe.tryUnlockDensityPlot();
				ShowMe.tryUnlockTrendLines();
				VisualizationPane.showLoader();
				VisualizationPane.allowUpdating();
				VegaliteGenerator.generateSpecification(); // may block vis update and restore state
				VisualizationPane.tryUpdating();

				// look ahead
				LookAheadEventHandler.listenEvent();
			}

			if (!hoveredShelfName && !isOnFilterShelf) {
				// remove highlight
				DraggableCapsule.remove();
				Shelves.removeHighlight();
				FilterShelf.removeHighlight();

				// redraw chart using vega-lite
				ShowMe.tryUnlockDensityPlot();
				ShowMe.tryUnlockTrendLines();
				VisualizationPane.showLoader();
				VisualizationPane.allowUpdating();
				VegaliteGenerator.generateSpecification(); // may block vis update
				VisualizationPane.tryUpdating();

				// look ahead
				LookAheadEventHandler.listenEvent();
			}

		}
	}
}

function installRemoveButtonBehaviour() {
	const self = this;
	let capsuleRemoveButtonSelector = self.className + ' .capsule .fa-times';

	$(capsuleRemoveButtonSelector)
		.on('click', onClickRemoveButton);

	function onClickRemoveButton() {
		PreviewMode.confirm();

		// clear capsule
		self.removeCapsule();
		Tooltip.remove()

		// redraw chart
		ShowMe.tryUnlockDensityPlot();
		ShowMe.tryUnlockTrendLines();
		VisualizationPane.showLoader();
		VisualizationPane.allowUpdating();
		VegaliteGenerator.generateSpecification(); // may block vis update
		VisualizationPane.tryUpdating();

		// look ahead
		LookAheadEventHandler.listenEvent();
	}
}

function pauseTooltipFor(pauseTime = 500) {
	const self = this;

	// no tooltip
	$(self.className)
		.addClass('no-tooltip');

	// restore tooltip after ...
	setTimeout(function(){
		$(self.className)
			.removeClass('no-tooltip');
	}, pauseTime);
}

function checkPosition() {
	const self = this;
	let shelfPosition = $(self.className).offset();
	let shelfWidth = $(self.className).width();
	let shelfHeight = $(self.className).height();

	self.position.left = shelfPosition.left;
	self.position.right = shelfPosition.left + shelfWidth;
	self.position.top = shelfPosition.top;
	self.position.bottom = shelfPosition.top + shelfHeight;
}

function isMouseOnTop(mouseX, mouseY) {
	const self = this;

	if (mouseX >= self.position.left && 
		mouseX <= self.position.right &&
		mouseY >= self.position.top &&
		mouseY <= self.position.bottom)
		return true;

	return false;
}

function highlight() {
	const self = this;

	$(self.className)
		.addClass('highlight')
		.removeClass('double');
}

function doubleHighlight() {
	const self = this;

	$(self.className)
		.addClass('highlight')
		.addClass('double');
}

function removeHighlight() {
	const self = this;

	$(self.className)
		.removeClass('highlight')
		.removeClass('double');
}

function blink() {
	const self = this;

	// add blink class and remove after one sec
	$(self.className).addClass('blink');
	setTimeout(function() { $(self.className).removeClass('blink'); }, 1000)
}

function createCapsule(isAttrAutoGenerated, isAttrOriginallyNominal, isPreview = false) {
	const self = this;
	let capsuleSelector = self.className + ' .capsule';
	let capsuleContentHTML = '<span class="fa attribute-type"></span>' +
						 	 '<span class="aggregate-or-time-unit"></span>' +
						 	 '<span class="attribute-name"></span>' +
						 	 '<span class="fa fa-cog" data-tooltip="Change variable type and function"></span>' +
						 	 '<span class="fa fa-times" data-tooltip="Remove variable"></span>';

	$(capsuleSelector)
		.html(capsuleContentHTML)
		.addClass('occupied')
		.removeClass('auto-generated')
		.removeClass('originally-nominal')
		.removeClass('preview');

	if (isAttrAutoGenerated) 
		$(capsuleSelector).addClass('auto-generated');

	if (isAttrOriginallyNominal) 
		$(capsuleSelector).addClass('originally-nominal');

	if (isPreview) 
		self.startPreview();
}

function removeCapsule() {
	const self = this;
	let capsuleContainerSelector = self.className + ' .container';
	let capsuleSelector = self.className + ' .capsule';

	// remove data
	d3.select(capsuleContainerSelector)
		.datum(null);

	// remove visual
	$(capsuleSelector)
		.html('')
		.removeClass('occupied')
		.removeClass('auto-generated')
		.removeClass('originally-nominal');
}

function refreshCapsule() {
	const self = this;
	let capsuleContainerSelector = self.className + ' .container';
	let capsuleData = d3.select(capsuleContainerSelector).datum();
	let hasCapsuleData = Helpers.isObject(capsuleData);

	if (hasCapsuleData) {
		let attributeName = capsuleData.attributeName;
		let attributeType = capsuleData.type;
		let attributeAggregateOrTimeUnit = (capsuleData.aggregate != 'none') ? capsuleData.aggregate : ((capsuleData.timeUnit != 'none') ? capsuleData.timeUnit : '');
		let needParenthesis = (attributeAggregateOrTimeUnit === '') ? false : true;
		let isAttrAutoGenerated = capsuleData.isAutoGenerated;
		let isAttrOriginallyNominal = (Database.attributeMetadata[attributeName].type == 'nominal');

		self.createCapsule();
		self.installCapsuleTooltip();
		self.installRemoveButtonBehaviour();
		self.installDragCapsuleBehaviour(); // setting button handled in Listener class
		self.changeCapsuleAutoGeneratedClass(isAttrAutoGenerated);
		self.changeCapsuleOriginallyNominalClass(isAttrOriginallyNominal);
		self.changeCapsuleAttributeType(attributeType);
		self.changeCapsuleAttributeName(attributeName, needParenthesis);
		self.changeAggregateOrTimeUnit(attributeAggregateOrTimeUnit);
		self.adjustAttributeNameWidth();
	}

	if (!hasCapsuleData)
		self.removeCapsule();
}

function changeCapsuleAttributeType(attributeType) {
	const self = this;
	let capsuleAttributeTypeSelector = self.className + ' .capsule .attribute-type';

	if (attributeType == 'temporal')
		$(capsuleAttributeTypeSelector)
			.addClass('fa-calendar');

	if (attributeType == 'quantitative')
		$(capsuleAttributeTypeSelector)
			.addClass('fa-hashtag');

	if (attributeType == 'nominal' || attributeType == 'ordinal')
		$(capsuleAttributeTypeSelector)
			.addClass('fa-font');
}

function changeCapsuleAttributeName(attributeName, parenthesis = false) {
	const self = this;
	let capsuleSelector = self.className + ' .capsule';
	let capsuleAttributeNameSelector = self.className + ' .capsule .attribute-name';

	if (parenthesis)
		$(capsuleAttributeNameSelector)
			.html('<span class="parenthesis">(</span>' + attributeName + '<span class="parenthesis">)</span>');

	if (!parenthesis)
			$(capsuleAttributeNameSelector)
				.html(attributeName);
}

function changeAggregateOrTimeUnit(aggregateOrTimeUnit) {
	const self = this;
	let capsuleAggregateOrTimeUnitSelector = self.className + ' .capsule .aggregate-or-time-unit';

	$(capsuleAggregateOrTimeUnitSelector)
		.html(aggregateOrTimeUnit);
}

function changeCapsuleAutoGeneratedClass(isAttrAutoGenerated) {
	const self = this;
	let capsuleSelector = self.className + ' .capsule';

	$(capsuleSelector)
		.removeClass('auto-generated');

	if (isAttrAutoGenerated)
		$(capsuleSelector)
			.addClass('auto-generated');
}

function changeCapsuleOriginallyNominalClass(isAttrOriginallyNominal) {
	const self = this;
	let capsuleSelector = self.className + ' .capsule';

	$(capsuleSelector)
		.removeClass('originally-nominal');

	if (isAttrOriginallyNominal)
		$(capsuleSelector)
			.addClass('originally-nominal');
}

function adjustAttributeNameWidth() {
	const self = this;
	let capsuleSelector = self.className + ' .capsule';
	let attributeNameLength = { short: 105, long: 125 };

	let aggregateOrTimeUnitWidth = $(capsuleSelector).find('.aggregate-or-time-unit').width();
	let hasRemoveButton = true;
	let hasSettingButton = !$(capsuleSelector).hasClass('auto-generated') && 
						   !$(capsuleSelector).hasClass('originally-nominal');
		
	if (hasSettingButton && hasRemoveButton)
		$(capsuleSelector).find('.attribute-name')
			.css('width', attributeNameLength.short - aggregateOrTimeUnitWidth);

	if (!hasSettingButton && hasRemoveButton)
		$(capsuleSelector).find('.attribute-name')
			.css('width', attributeNameLength.long - aggregateOrTimeUnitWidth);
}

function startPreview() {
	const self = this;
	let capsuleSelector = self.className + ' .capsule';

	$(capsuleSelector)
		.addClass('preview');
}

function endPreview() {
	const self = this;
	let capsuleSelector = self.className + ' .capsule';

	$(capsuleSelector)
		.removeClass('preview');
}

function getCapsuleData() {
	const self = this;
	let capsuleContainerSelector = self.className + ' .container';

	return d3.select(capsuleContainerSelector).datum();
}

function storeCapsuleData(capsuleData) {
	const self = this;
	let capsuleContainerSelector = self.className + ' .container';

	d3.select(capsuleContainerSelector)
		.datum(capsuleData);
}

function saveState(capsuleData) {
	const self = this;

	self.previousCapsuleData = capsuleData;
}

function restoreState() {
	const self = this;
	let previousCapsuleData = self.previousCapsuleData;
	let hasSavedState = (self.previousCapsuleData !== null);

	if (hasSavedState) {
		self.storeCapsuleData(previousCapsuleData);
		self.refreshCapsule();
	}
}

function clearState() {
	const self = this;

	self.previousCapsuleData = null;
}

function isEmpty() {
	const self = this;
	let capsuleSelector = self.className + ' .capsule';
	let isShelfOccupied = $(capsuleSelector).hasClass('occupied');

	return !isShelfOccupied;
}