const LookAheadDatabase = {
	filteredData: null,
	minMaxForEachAttribute: null, // for quantitative
	uniqueValuesForEachAttribute: null, // for nominal and generated temporal
	attributeToDataByCategory: null, // for nominal and generated temporal

	maxNumberOfCategories: 51, // select only nominal attributes with <= 51 categories to enum
	numOfCategoriesWhenSamplingOccurs: 15, // above this, sampling occurs
	nominalAttrCombinations: null,

	init: function() {
		const self = this;
		
		self.filteredData = null;
		self.minMaxForEachAttribute = null;
		self.uniqueValuesForEachAttribute = null;
		self.attributeToDataByCategory = null;
	},
	processData: function() {
		const self = this;
		
		self.filterData();
		self.getMinMaxForEachAttribute();
		self.getUniqueValuesForEachAttribute();
		self.getAttributeToDataByCategory();
	},

	// filterData

	filterData: function() {
		const self = this;
		let filteredData = Filters.getFilteredData();

		self.filteredData = filteredData;
	},

	// getMinMaxForEachAttribute

	getMinMaxForEachAttribute: function() {
		const self = this;
		let filteredData = self.filteredData;
		let minMaxForEachAttribute = {};

		for (let currentAttributeName in Database.attributeMetadata) {
			let isCurrentAttributeQuantitative = (Database.attributeMetadata[currentAttributeName].type == 'quantitative');
			let isCurrentAttributeAutoGenerated = Database.attributeMetadata[currentAttributeName].isAutoGenerated;

			if (isCurrentAttributeQuantitative && !isCurrentAttributeAutoGenerated) 
				minMaxForEachAttribute[currentAttributeName] = {
					min: d3.min(filteredData, function(d) { return +d[currentAttributeName]; }),
					max: d3.max(filteredData, function(d) { return +d[currentAttributeName]; })
				}
		}

		self.minMaxForEachAttribute = minMaxForEachAttribute;
	},

	// getUniqueValuesForEachAttribute

	getUniqueValuesForEachAttribute: function() {
		const self = this;
		let filteredData = self.filteredData;
		let norminalTemporalAttrList = self.getNorminalTemporalAttrList();
		let uniqueValuesForEachAttribute = {};

		for (let i = 0; i < norminalTemporalAttrList.length; i++) {
			let currentAttributeName = norminalTemporalAttrList[i];
			let uniqueValuesForCurrentAttr = {};

			for (let i = 0; i < filteredData.length; i++) {
				let currentRow = filteredData[i];
				let currentValue = currentRow[currentAttributeName];
				let isCurrentValueMissing = (currentValue === null);

				if (!isCurrentValueMissing)
					uniqueValuesForCurrentAttr[currentValue] = null;
			}

			uniqueValuesForEachAttribute[currentAttributeName] = Object.keys(uniqueValuesForCurrentAttr);
		}

		self.uniqueValuesForEachAttribute = uniqueValuesForEachAttribute;
	},
	getNorminalTemporalAttrList: function() {
		let norminalTemporalAttrList = [];

		for (let currentAttributeName in Database.attributeMetadata) {
			let currentAttributeType = Database.attributeMetadata[currentAttributeName].type;
			let isCurrentAttributeAutoGenerated = Database.attributeMetadata[currentAttributeName].isAutoGenerated;
			let isCurrentAttributeNominal = (currentAttributeType == 'nominal');
			let isCurrentAttributeTemporal = (currentAttributeType == 'temporal');

			if (isCurrentAttributeAutoGenerated)
				continue;

			if (isCurrentAttributeNominal)
				norminalTemporalAttrList.push(currentAttributeName);

			if (isCurrentAttributeTemporal) {
				norminalTemporalAttrList.push(currentAttributeName + ' (year)');
				norminalTemporalAttrList.push(currentAttributeName + ' (month)');
				norminalTemporalAttrList.push(currentAttributeName + ' (day)');
			}
		}

		return norminalTemporalAttrList;
	},

	// getAttributeToDataByCategory

	getAttributeToDataByCategory: function() {
		const self = this;
		let filteredData = self.filteredData;
		let uniqueValuesForEachAttribute = self.uniqueValuesForEachAttribute;
		let attributeToDataByCategory = self.initAttributeToDataByCategory();

		for (let i = 0; i < filteredData.length; i++) {
			let currentRow = filteredData[i];

			for (let currentAttributeName in uniqueValuesForEachAttribute) {
				let currentValue = currentRow[currentAttributeName];
				let isCurrentValueMissing = (currentValue === null);

				if (!isCurrentValueMissing)
					attributeToDataByCategory[currentAttributeName][currentValue].push(currentRow);
			}
		}

		self.attributeToDataByCategory = attributeToDataByCategory;
	},
	initAttributeToDataByCategory: function() {
		const self = this;
		let uniqueValuesForEachAttribute = self.uniqueValuesForEachAttribute;
		let attributeToDataByCategory = {};

		for (let currentAttributeName in uniqueValuesForEachAttribute) {
			let allUniqueValues = uniqueValuesForEachAttribute[currentAttributeName];

			attributeToDataByCategory[currentAttributeName] = {};

			for (let i = 0; i < allUniqueValues.length; i++) {
				let currentValue = allUniqueValues[i];
				attributeToDataByCategory[currentAttributeName][currentValue] = [];
			}
		}

		return attributeToDataByCategory;
	},

	// generateNominalAttrComb


	generateCombinationsForAllNominalAttributes: function(numOfCategoriesInComb) {
		const self = this;
		let allSmallNominalAttributes = self.getAttributesByType('nominal');
		let nominalAttrCombinations = {};

		// generate all required combinations
		for (let i = 0; i < allSmallNominalAttributes.length; i++) {
			let currentAttributeName = allSmallNominalAttributes[i];
			let allCombinations = null;
			let currentAttributeCategoryList = self.getUniqueValueListAfterFiltering(currentAttributeName);

			let minNumberOfCategories = numOfCategoriesInComb;
			let maxNumberOfCategories = self.maxNumberOfCategories;
			let numOfCategoriesWhenSamplingOccurs = self.numOfCategoriesWhenSamplingOccurs;
			let currentNumberOfCategories = currentAttributeCategoryList.length;
			let listWithAtMostNCategories = null;
			let maxNumberOfCombinations = null;
			let listWithAtMostNCombinations = null;

			// few categories, direct use the list to generate combinations
			if (currentNumberOfCategories >= minNumberOfCategories && 
				currentNumberOfCategories <= maxNumberOfCategories &&
				currentNumberOfCategories <= numOfCategoriesWhenSamplingOccurs) {
				allCombinations = Combinatorics.combination(currentAttributeCategoryList, numOfCategoriesInComb).toArray();
				nominalAttrCombinations[currentAttributeName] = allCombinations;
			}

			// many categories, sample before generating combinations
			if (currentNumberOfCategories >= minNumberOfCategories && 
				currentNumberOfCategories <= maxNumberOfCategories &&
				currentNumberOfCategories > numOfCategoriesWhenSamplingOccurs) {
				listWithAtMostNCategories = self.sampleCategories(currentAttributeCategoryList, 20);
				allCombinations = Combinatorics.combination(listWithAtMostNCategories, numOfCategoriesInComb).toArray();
				maxNumberOfCombinations = Combinatorics.C(4, numOfCategoriesInComb);
				listWithAtMostNCombinations = Helpers.shuffle(allCombinations).slice(0, maxNumberOfCombinations);
				nominalAttrCombinations[currentAttributeName] = listWithAtMostNCombinations;
			}
		}

		self.nominalAttrCombinations = nominalAttrCombinations;
	},
	sampleCategories: function(categoryList, maxNumberOfSamples) {
		let maxNumberOfCategories = LookAheadDatabase.maxNumberOfCategories;
		let currentNumberOfCategories = categoryList.length;
		let randomCategoryList = [];
		let listWithAtMostNCategories = null;

		if (currentNumberOfCategories > maxNumberOfSamples)
			for (let i = 0; i < maxNumberOfSamples; i++) {
				let currentIndex = Math.floor(Math.random() * currentNumberOfCategories);
				let currentCategory = categoryList[currentIndex];
				let alreadyPushed = randomCategoryList.indexOf(currentCategory) != -1;
				if (!alreadyPushed) randomCategoryList.push(currentCategory);
			}

		if (currentNumberOfCategories <= maxNumberOfSamples)
			listWithAtMostNCategories = categoryList;

		if (currentNumberOfCategories > maxNumberOfSamples)
			listWithAtMostNCategories = randomCategoryList;

		return listWithAtMostNCategories;
	},

	// getters

	getUniqueValueListAfterFiltering: function(attributeName) {
		const self = this;
		let isCurrentAttributeNominalOrTemporal = (attributeName in self.uniqueValuesForEachAttribute);

		if (!isCurrentAttributeNominalOrTemporal)
			return Database.uniqueValuesForEachAttribute[attributeName]

		return self.uniqueValuesForEachAttribute[attributeName];
	},
	getAttributesByType: function(attributeType) {
		const self = this;
		let requiredAttributeList = [];

		for (let currentAttributeName in Database.attributeMetadata) {
			let currentAttributeType = Database.attributeMetadata[currentAttributeName].type;
			let isCurrentAttributeAutoGenerated = Database.attributeMetadata[currentAttributeName].isAutoGenerated;
			let isCurrentTypeNominalOrdinal = (currentAttributeType == 'nominal' || currentAttributeType == 'ordinal');
			let uniqueValueList = null, tooManyUniqueValues = null;

			if (isCurrentAttributeAutoGenerated)
				continue;

			if (!isCurrentAttributeAutoGenerated) {
				uniqueValueList = self.getUniqueValueListAfterFiltering(currentAttributeName);
				tooManyUniqueValues = (uniqueValueList.length > LookAheadDatabase.maxNumberOfCategories);
			}

			if (currentAttributeType == attributeType && !isCurrentTypeNominalOrdinal)
				requiredAttributeList.push(currentAttributeName);

			if (currentAttributeType == attributeType && isCurrentTypeNominalOrdinal && !tooManyUniqueValues)
				requiredAttributeList.push(currentAttributeName);
		}

		return requiredAttributeList;
	}
}