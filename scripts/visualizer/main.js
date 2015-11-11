define([
    'Cesium',
    './template',
    './3dviewer',
    './models',
    './utilities'
],function(
    Cesium,
    template,
    GeospatialSection,
    models,
    utilities
)
{
    "use strict";

    var Visualizer = function (container,options) {
        template.CreateElements(container);
        var self = this;
        this.geospatialcontainer = "GeoViewer";
        this._geospatialSection = undefined;
        this._geospatialBool = true;
        this._dataDrawn = false;
        this._barPlotted = false;
        this._defaultRangeMin = 0.0;
        this._defaultRangeMax = 0.0;
        this.customRangeMin = 0.0;
        this.customRangeMax = 0.0;
        this._defaultEntityCollection = new Cesium.EntityCollection();

        this._startColor = '0AF229';
        this._endColor = 'F20505';

        this._defaultDatasetCollection = new models.DatasetCollection();
        this._defaultVariableCollection = new models.VariableCollection();

        this._startColorPicker = $("#StartColor").spectrum({
            color: "#" + this._startColor,
            change: function(color){updateColor();}
            });

        this._endColorPicker = $("#EndColor").spectrum({
            color: "#" + this._endColor,
            change: function(color){updateColor();}
        });

        if (this._geospatialBool == true) {
            self._geospatialSection = new GeospatialSection.GeospatialSection(this.geospatialcontainer);
        }

        this.LoadEntities = function(geojsonURL,fileFormat, extrudeBool){
            var dataSource;
            if (fileFormat == 'geojson'){
                dataSource = new Cesium.GeoJsonDataSource();
            }
            else if (fileFormat == 'kml'){
                dataSource = new Cesium.KmlDataSource();
            }
            else{
                console.warn("Data source has to be geojson or kml format!");
                return;
            }
            dataSource.load(geojsonURL).then(function(datasource){
                console.log('read datasource finished!');
                self._geospatialSection.viewer.dataSources.add(datasource);
                self._geospatialSection.viewer.flyTo(datasource.entities);
                var entities = datasource.entities;
                entities.suspendEvents();
                for (var i=0; i < datasource.entities.values.length; i++){
                    var entity = entities.values[i];
                    models.customizeEntity(entity);
                    self._defaultEntityCollection.add(entity)
                    if (extrudeBool == true){
                        GeospatialSection.extrudeEntity(entity);
                    }
                }
                console.log(entities);
                entities.resumeEvents();
            });
        };

        this.setTimeLine = function(startTime, endTime, speed){
            self._geospatialSection.viewer.timeline.zoomTo(startTime, endTime);
            self._geospatialSection.viewer.clock.startTime = startTime;
            self._geospatialSection.viewer.clock.currentTime = startTime;
            self._geospatialSection.viewer.clock.stopTime = endTime;
            self._geospatialSection.viewer.clock.multiplier = speed;
            self._geospatialSection.viewer.clock.clockRange = Cesium.ClockRange.CLAMPED;
        };

        this.setTimeLine(
            new Cesium.JulianDate.fromIso8601('2015-01-01'),
            new Cesium.JulianDate.fromIso8601('2015-02-01'),
            1000
        );

        function addTimeSeries(entity, variable, timeseries){
            var sampled = new Cesium.SampledProperty(Number);
            for (var key in timeseries){
                sampled.addSample(Cesium.JulianDate.fromIso8601(key),timeseries[key]);
            }
            entity[variable.name] = sampled;
        }

        //Some worker functions for main.js
        function updateColor(){
            self._startColor = self._startColorPicker.spectrum('get').toHex();
            self._endColor = self._endColorPicker.spectrum('get').toHex();
            //self.drawEntity();
        }

        function drawLegend(colorMin, colorMax, rangeMin, rangeMax){
            var ctx = document.getElementById("visualizer-legend-canvas").getContext("2d");
            ctx.clearRect(0, 0, 400, 70);
            var grd = ctx.createLinearGradient(0, 0, 400, 0);
            grd.addColorStop(0, "#"+colorMin);
            grd.addColorStop(1, "#"+colorMax);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0,0,400,70);
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, 400, 40);
            ctx.font = "15px Arial";
            ctx.fillText(rangeMin,1,60);
            ctx.textAlign = "center";
            ctx.fillText((((rangeMin+rangeMax)/2)).toString(), 200, 60);
            ctx.textAlign = "right";
            ctx.fillText(rangeMax,399,60);
            console.log("legend draw complete");
        }
    };
    return{
        Visualizer: Visualizer
    };
});
