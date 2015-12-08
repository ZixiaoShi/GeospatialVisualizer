/**
 * 
 */
define([
		"Cesium",
	'./utilities'
],function(
		Cesium,
		utilities
){
	"use strict";

	var GeospatialSection = function(container){
		var self = this;
		//Create Cesium Container
		this.viewer = new Cesium.Viewer(container,{
			//imageryProvider : new Cesium.OpenStreetMapImageryProvider(),
			baseLayerPicker : false,
			geoCoder: false,
			animation: true,
			navigationInstructionsInitiallyVisible: true,
			infoBox: true,
			sceneModePicker: false,
			scene3DOnly: false,
			timeline: true,
			useDefaultRenderLoop:true,
		});
		var helper = new Cesium.EventHelper();
		//helper.add(this.viewer.clock.onTick, tickUpdate, this);

		function tickUpdate(){
			//console.log(this.viewer.clock.currentTime);
			for(var i = 0; i < this.viewer.entities.values.length; i++){
				var entity = this.viewer.entities.values[i];
				if (entity.properties.values["Electricity"]){
					console.log(entity.properties.values["Electricity"].getValue(this.viewer.clock.currentTime));
				}
			}
		}
	};

	var defaultColor = Cesium.Color.fromBytes(255, 255, 255, 25);

    var extrudeEntity = function(entity){
		//utilities.changeAlpha(entity, 'FFFFFF', 1.0);
		try{
			entity.polygon.material = Cesium.Color.WHITE;
			entity.polygon.outline = false;
			entity.polygon.extrudedHeight = entity.properties.Height;
		}
		catch(exp) {
			console.log(exp);
		}
    };


	return{
		GeospatialSection: GeospatialSection,
        extrudeEntity: extrudeEntity
	};
});
