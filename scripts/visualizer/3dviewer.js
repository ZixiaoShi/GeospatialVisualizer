/**
 * 
 */
define([
		"Cesium"
],function(
		Cesium
){
	"use strict";

	var GeospatialSection = function(container){
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
			useDefaultRendeLoop:true,
		});
	};

    var extrudeEntity = function(entity){
        entity.polygon.material = Cesium.Color.GAINSBORO;
        entity.polygon.outline = false;
        entity.polygon.extrudedHeight = entity.properties.Height;
    }

	return{
		GeospatialSection: GeospatialSection,
        extrudeEntity: extrudeEntity
	};
});
