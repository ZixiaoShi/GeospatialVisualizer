/**
 * 
 * This file contains all the common models used in the Visualizer file
*/
//Those two classes defines the dataset, and array of datasets, with some built in functions
//By default the position of the datasets start from the first one

define([
    'Cesium'
],
function(
    Cesium
){

    var customizeEntity = function(entity){
        entity.addProperty("Value");
        entity.properties.Values = undefined;
        entity.label = new Cesium.LabelGraphics({
            text: entity.name
        });
    };

	var Dataset = function(name, settings){
		this.name = name;
		this.settings = settings;
		this.data = {};
		this.adddata = function(id, url){
			this.data[id] = url;
		}
	};

	var DatasetCollection = function(){
		this.values = [];
		this.position = 0;
		this.getCurrentDataset = function(){return this.values[this.position]};

		this.nextDataset = function(){
			if(this.position < this.values.length){
				this.values += 1;
				return this.getCurrentDataset();
			}
			else{
				return this.getCurrentDataset();
			}
		};

		this.previousDataSet = function(){
			if(this.position > 0 ){
				this.values -= 1;
				return this.getCurrentDataset();
			}
			else{
				return this.getCurrentDataset();
			}
		};

		this.addDataset = function(dataset){
			if (dataset instanceof Dataset){
				this.values.push(dataset);
			}
			else{
				console.warn("Cannot add Dataset, it is not an instance of Dataset");
			}
		};

		this.getDataset = function(name){
			return getByName(this.values, name);
		}
	};

	//Those two classes define the variables that are to be visualized
	var Variable = function(name, unit){
		this.name = name;
		this.unit = unit;
	};

	var VariableCollection = function(){
		this.values = [];
		this.position = 0;
		this.getCurrentVariable = function(){return this.values[this.position]};

		this.nextVairable = function(){
			if(this.position < this.values.length){
				this.values += 1;
				return this.getCurrentVariable();
			}
			else{
				return this.getCurrentVariable();
			}
		};

		this.previousVariable = function(){
			if(this.position > 0 ){
				this.values -= 1;
				return this.getCurrentVariable();
			}
			else{
				return this.getCurrentVariable();
			}
		}

		this.addVariable = function(variable){
			if (variable instanceof Variable){
				this.values.push(variable);
			}
			else{
				console.warn("Cannot add Variable, it is not an instance of Variable");
			}
		};

		this.getVariable = function(name){
			return getByName(this.values, name);
		}
	};



	return{
        customizeEntity: customizeEntity,
		Dataset: Dataset,
		DatasetCollection: DatasetCollection,
		Variable: Variable,
		VariableCollection: VariableCollection
	};
});