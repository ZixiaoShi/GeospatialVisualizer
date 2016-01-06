/**
 * 
 * This file contains all the common models used in the Visualizer file
*/
//Those two classes defines the dataset, and array of datasets, with some built in functions
//By default the position of the datasets start from the first one

define([
	'jquery',
    'Cesium',
		'./utilities'
],
function(
		$,
    Cesium,
		utilities
){

    var customizeEntity = function(entity){
        entity.addProperty("value");
        //entity.addProperty("values");
		entity.addProperty("color");
        //entity.properties.values = {};
		entity.properties.value = 0.0;
		if (typeof entity.properties.Elevation !== 'undefined'){
			entity.polygon.height = parseFloat(entity.properties.Elevation);
		}
		/*
        entity.label = new Cesium.LabelGraphics({
            text: entity.name
        });
        */
    };

	var Entity = function(id, options){
		this.id = id;
		this.name = (typeof options.name === 'undefined') ? undefined : options.name;
		this.available = true;
		this.category = (typeof options.category === 'undefined') ? undefined: options.category;
		this.cesiumEntities = [];
		this.value = 0.0;
		this.color = 'FFFFFF';
		this.properties = {};
		this.alpha = (typeof options.alpha === 'undefined') ? 1.0 : options.alpha;
		this.highlight = false;
		this.height = 0.0;
	};

	Entity.prototype.addCesiumEntity = function(entity){
		this.cesiumEntities.push(entity);
	};

	Entity.prototype.changeAvailability = function(input){
		if (this.available == input) {return; }
		this.available = input;
		var color = this.color;
		var alpha = this.alpha;
		if (input == false){
			$.each(this.cesiumEntities, function(key,entity){
				//console.log(entity);
				utilities.changeAlpha(entity, color, 0.2);
			});
		}
		if (input == true){
			$.each(this.cesiumEntities, function(key,entity){
				utilities.changeAlpha(entity, color, alpha);
			});
		}
	};

	Entity.prototype.highLight = function(input){
		if (this.highlight == input) {return;}
		this.highlight = input;
		if (input == true){
			$.each(this.cesiumEntities, function(key,cesiumEntity){
				cesiumEntity.polygon.outline=true;
				cesiumEntity.polygon.outlineColor = Cesium.Color.BLACK;
			});
		}
		else if (input == false){
			$.each(this.cesiumEntities, function(key,cesiumEntity){
				cesiumEntity.polygon.outline=false;
				cesiumEntity.polygon.outlineColor = Cesium.Color.BLACK;
			});
		}
	};

	Entity.prototype.changeColor = function(color){
		if (this.value !== 0.0){
			this.color = color;
		}
		var alpha = this.alpha;
		if (this.available == false){
			alpha = 0.2;
		}
		var colorInput = this.color;
		$.each(this.cesiumEntities, function(key, cesiumEntity){
			utilities.changeAlpha(cesiumEntity, colorInput, alpha)
		});
	};

	Entity.prototype.changeValue = function(value){
		this.value = value;
	};

	var EntityCollection = function(){
		this.values = {};
		this.categories = {};
	};

	EntityCollection.prototype.AddCesiumEntity = function(cesiumEntity, properties){
		if (!(cesiumEntity.properties.Id in this.values)){
			var newEntity = new Entity(cesiumEntity.properties.Id, {
				name: cesiumEntity.properties.Name,
				category: cesiumEntity.properties.Category
			});
			if( this.categories[newEntity.category] == undefined){
				this.categories[newEntity.category] = [newEntity.id];
			}
			else{
				this.categories[newEntity.category].push(newEntity.id);
			}

			for(var i=0; i<properties.length; i++){
				newEntity.properties[properties[i]] = cesiumEntity.properties[properties[i]];
			}
			newEntity.addCesiumEntity(cesiumEntity);
			this.values[cesiumEntity.properties.Id] = newEntity;
		}
		else{
			this.values[cesiumEntity.properties.Id].addCesiumEntity(cesiumEntity);
		}
	};

	EntityCollection.prototype.getEntity = function(id){
		return this.values[id];
	};

	EntityCollection.prototype.highLightCategory = function(category){
		if (category == "All"){
			$.each(this.values, function(id, entity){
				entity.changeAvailability(true);
			});
		}
		else {
			$.each(this.values, function(id, entity){
				if (entity.category == category){
					entity.changeAvailability(true);
				}
				else{
					entity.changeAvailability(false);
				}
			});
		}
	};

	var Data = function(id, url){
		this.id = id;
		this.url = url;
		this.timeInterval = undefined;
		this.timeSamples = undefined;
		this.entityId = [];
		this.getValue = function(time){
			return this.timeInterval.getValue(time);
		};
		this.addEneity = function(entityid){
			this.entityId.push(entityid);
		};
		this.value = 0.0;
		this.color = undefined;
		this.name = undefined;
		this.minimum = 0.0;
		this.maximum = 0.0;
	};

	var Dataset = function(name, settings){
		this.name = name;
		this.settings = settings;
		this.data = {};
		this.adddata = function(id, data){
			this.data[id] = data;
		};
		this.getdata = function(id){
			return this.data[id];
		}
	};

	var DatasetCollection = function(){
		this.values = {};
		this.position = 0;

		this.getDataset = function(name){
			return getByName(this.values, name);
		}
	};

	DatasetCollection.prototype.nextDataset = function(variable){
		if(this.position < this.values.length){
			this.position += 1;
			return this.getCurrentDataset(variable);
		}
		else{
			return this.getCurrentDataset(variable);
		}
	};

	DatasetCollection.prototype.previousDataSet = function(variable){
		if(this.position > 0 ){
			this.position -= 1;
			return this.getCurrentDataset(variable);
		}
		else{
			return this.getCurrentDataset(variable);
		}
	};

	DatasetCollection.prototype.addDataset = function(dataset, variable){
		if (dataset instanceof Dataset){
			if (!this.values[variable.name]){
				this.values[variable.name] = [dataset];
			}
			else{
				this.values[variable.name].push(dataset);
			}
		}
		else{
			console.warn("Cannot add Dataset, it is not an instance of Dataset");
		}
	};

	DatasetCollection.prototype.getDatasetList = function(variable){
		var dataset = this.values[variable.name];
		if (dataset === undefined ){return undefined}
		return dataset;
	};

	DatasetCollection.prototype.getCurrentDataset = function(variable){
		var dataset = this.values[variable.name];
		if (dataset === undefined ){return undefined}
		return dataset[this.position];
	};

	DatasetCollection.prototype.setCurrentDataset = function(variable, name){
		var dataset = this.values[variable.name];
		if(dataset == undefined) {return; }
		var index = -1;
		for(var i = 0; i < dataset.length; i += 1) {
			if(dataset[i].name === name) {
				index =  i;
			}
		}
		if (index !== -1){
			this.position = index;
		}
	};

	//Those two classes define the variables that are to be visualized
	var Variable = function(name, unit){
		this.name = name;
		this.unit = unit;
	};

	var VariableCollection = function() {
		this.values = [];
		this.position = 0;
	};

	VariableCollection.prototype.previousVariable = function(){
		if(this.position > 0 ){
			this.position -= 1;
			return this.getCurrentVariable();
		}
		else{
			return this.getCurrentVariable();
		}
	};

	VariableCollection.prototype.nextVairable = function(){
		if(this.position < this.values.length){
			this.position += 1;
			return this.getCurrentVariable();
		}
		else{
			return this.getCurrentVariable();
		}
	};

	VariableCollection.prototype.getCurrentVariable = function(){
		//console.log(this.values);
		//console.log(this.values[0]);
		return this.values[this.position]
	};

	VariableCollection.prototype.addVariable = function(variable){
		if (variable instanceof Variable){
			this.values.push(variable);
		}
		else{
			console.warn("Cannot add Variable, it is not an instance of Variable");
		}
	};

	VariableCollection.prototype.setVariableByName = function(name){
		var index = -1;
		for(var i = 0; i < this.values.length; i += 1) {
			if(this.values[i].name === name) {
				index =  i;
			}
		}
		if (index !== -1){
			this.position = index;
		}
	};



	return{
        customizeEntity: customizeEntity,
		Entity: Entity,
		EntityCollection: EntityCollection,
		Data: Data,
		Dataset: Dataset,
		DatasetCollection: DatasetCollection,
		Variable: Variable,
		VariableCollection: VariableCollection
	};
});