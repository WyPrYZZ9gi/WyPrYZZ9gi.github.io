let Shelves = {
	init: function() {
		const self = this;

		self.installTooltip();
	},
	
	// state

	saveState: function() {
		for (shelfName in Shelf) {
			let currentCapsuleData = Shelf[shelfName].getCapsuleData();
			let isDataObject = Helpers.isObject(currentCapsuleData);
			let copiedCapsuleData = null;

			if (isDataObject) {
				copiedCapsuleData = $.extend(true, {}, currentCapsuleData);
				Shelf[shelfName].saveState(copiedCapsuleData);
			}

			if (!isDataObject)
				Shelf[shelfName].saveState(currentCapsuleData);
		}
	},
	clearState: function() {
		for (shelfName in Shelf)
			Shelf[shelfName].clearState();
	},
	restoreState: function() {
		for (shelfName in Shelf)
			Shelf[shelfName].restoreState();
	},

	// preview

	preview: function(visSpec) {
		for (let currentShelfName in Shelf) {
			let currentEncodingName = Shelf[currentShelfName].encodingName;
			let currentEncodingInVisSpec = (currentEncodingName in visSpec);

			if (currentEncodingInVisSpec) {
				let attributeName = visSpec[currentEncodingName].attributeName;
				let attributeType = visSpec[currentEncodingName].type; // not consider derived type
				let attributeTimeUnitInVisSpec = ('timeUnit' in visSpec[currentEncodingName]) ? visSpec[currentEncodingName].timeUnit : 'none';
				let attributeAggregateInVisSpec = ('aggregate' in visSpec[currentEncodingName]) ? visSpec[currentEncodingName].aggregate : 'none';
				let isPreview = visSpec[currentEncodingName].added;

				let capsuleData = Database.attributeMetadata[attributeName];
				let copiedCapsuleData = $.extend(true, {}, capsuleData);
				let attributeAggregateOrTimeUnit = (attributeAggregateInVisSpec != 'none') ? attributeAggregateInVisSpec : ((attributeTimeUnitInVisSpec != 'none') ? attributeTimeUnitInVisSpec : '');
				let needParenthesis = (attributeAggregateOrTimeUnit === '') ? false : true;
				let isAttrAutoGenerated = capsuleData.isAutoGenerated;
				let isAttrOriginallyNominal = (Database.attributeMetadata[attributeName].type == 'nominal');

				// visually add capsule to shelf
				Shelf[currentShelfName].createCapsule(isAttrAutoGenerated, isAttrOriginallyNominal, isPreview);
				Shelf[currentShelfName].installCapsuleTooltip();
				Shelf[currentShelfName].installRemoveButtonBehaviour();
				Shelf[currentShelfName].installDragCapsuleBehaviour(); // setting button handled in Listener class
				Shelf[currentShelfName].changeCapsuleAttributeType(attributeType);
				Shelf[currentShelfName].changeCapsuleAttributeName(attributeName, needParenthesis);
				Shelf[currentShelfName].changeAggregateOrTimeUnit(attributeAggregateOrTimeUnit);
				Shelf[currentShelfName].adjustAttributeNameWidth();

				// store data
				copiedCapsuleData.attributeName = attributeName;
				copiedCapsuleData.isAddedByUser = false;
				copiedCapsuleData.capsuleLocation = 'shelf';
				copiedCapsuleData.timeUnit = attributeTimeUnitInVisSpec;
				copiedCapsuleData.aggregate = attributeAggregateInVisSpec;
				Shelf[currentShelfName].storeCapsuleData(copiedCapsuleData);
			}

			if (!currentEncodingInVisSpec)
				Shelf[currentShelfName].removeCapsule();
		}
	},
	endPreview: function() {
		for (shelfName in Shelf)
			Shelf[shelfName].endPreview();
	},

	// others

	getOccupiedShelfCapsuleData: function() {
		let occupiedShelfCapsuleData = [];

		for (shelfName in Shelf) {
			let isCurrentShelfOccupied = !Shelf[shelfName].isEmpty();
			let currentCapsuleData = Shelf[shelfName].getCapsuleData();

			if (isCurrentShelfOccupied)
				occupiedShelfCapsuleData.push(currentCapsuleData);
		}

		return occupiedShelfCapsuleData;
	},
	refreshCapsules: function() { // capsule changes based on underlying data
		for (shelfName in Shelf)
			Shelf[shelfName].refreshCapsule();
	},
	emptyAll: function() {
		for (shelfName in Shelf) {
			Shelf[shelfName].clearState();
			Shelf[shelfName].removeCapsule();
		}
	},
	installTooltip: function() {
		for (shelfName in Shelf)
			Shelf[shelfName].installShelfTooltip();
	},
	highlight: function() {
		for (shelfName in Shelf)
			Shelf[shelfName].highlight();
	},
	removeHighlight: function() {
		for (shelfName in Shelf)
			Shelf[shelfName].removeHighlight();
	},
	checkPosition: function() {
		for (shelfName in Shelf)
			Shelf[shelfName].checkPosition();
	},
	onWhich: function(mouseX, mouseY) {
		for (shelfName in Shelf)
			if (Shelf[shelfName].isMouseOnTop(mouseX, mouseY))
				return shelfName;

		return null;
	},
	areEmpty: function() {
		for (shelfName in Shelf)
			if (!Shelf[shelfName].isEmpty())
				return false;

		return true;
	}
}