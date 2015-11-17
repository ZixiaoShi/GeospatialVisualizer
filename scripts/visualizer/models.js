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
        entity.addProperty("values");
		entity.addProperty("color");
        entity.properties.values = {};
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
		};
		this.getdata = function(id){
			return this.data[id];
		}
	};

	var DatasetCollection = function(){
		this.values = {};
		this.position = 0;
		this.getCurrentDataset = function(variable){
			//console.log(self.values);
			return this.values[variable.name][this.position]
		};

		this.nextDataset = function(variable){
			if(this.position < this.values.length){
				this.values += 1;
				return this.getCurrentDataset(variable);
			}
			else{
				return this.getCurrentDataset(variable);
			}
		};

		this.previousDataSet = function(){
			if(this.position > 0 ){
				this.values -= 1;
				return this.getCurrentDataset(variable);
			}
			else{
				return this.getCurrentDataset(variable);
			}
		};

		this.addDataset = function(dataset, variable){
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
		this.getCurrentVariable = function(){
			//console.log(this.values);
			//console.log(this.values[0]);
			return this.values[this.position]};

		this.nextVairable = function(){
			if(this.position < this.values.length){
				this.position += 1;
				return this.getCurrentVariable();
			}
			else{
				return this.getCurrentVariable();
			}
		};

		this.previousVariable = function(){
			if(this.position > 0 ){
				this.position -= 1;
				return this.getCurrentVariable();
			}
			else{
				return this.getCurrentVariable();
			}
		};

		this.addVariable = function(variable){
			if (variable instanceof Variable){
				this.values.push(variable);
			}
			else{
				console.warn("Cannot add Variable, it is not an instance of Variable");
			}
		};
	};



	return{
        customizeEntity: customizeEntity,
		Dataset: Dataset,
		DatasetCollection: DatasetCollection,
		Variable: Variable,
		VariableCollection: VariableCollection
	};
});