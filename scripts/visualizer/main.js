define([
    'jquery',
    'Cesium',
    './template',
    './3dviewer',
    './models',
    './utilities',
    './heatmap',
    './2dviewer'
],function(
    $,
    Cesium,
    template,
    GeospatialSection,
    models,
    utilities,
    heatmap,
    PlanarSection
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
        this._defaultEntityCollection = {};
        this._defaultEntityCollectionNew = new models.EntityCollection();
        this._defaultTimeMin = undefined;
        this._defaultTimeMax = undefined;
        this._defaultAlpha = 0.8;

        this._startColor = '0AF229';
        this._endColor = 'F20505';

        this._defaultDatasetCollection = new models.DatasetCollection();
        this._defaultVariableCollection = new models.VariableCollection();
        this.d3Data = [];

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

        this.initiate = function(geojsonURL,fileFormat, extrudeBool, metaUrl){
            $.when(LoadEntities(geojsonURL,fileFormat, extrudeBool)).done(function(){
               self.LoadMeta(metaUrl);
            });
            /*
            $.when(this.LoadEntities(geojsonURL,fileFormat, extrudeBool)).done(
                function(){
                    $.when(self.LoadMeta(metaUrl)).done(function(){
                        //console.log(self._defaultVariableCollection);
                        //console.log(self._defaultDatasetCollection);
                        self.readCurrentTimeSeries();
                        //console.log(self._defaultEntityCollection);
                    });
                });
                */
        };

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
                return dfd;
            }
            return dataSource.load(geojsonURL).then(function(datasource){
                //console.log('read datasource finished!');
                self._geospatialSection.viewer.dataSources.add(datasource);
                self._geospatialSection.viewer.flyTo(datasource.entities);
                var entities = datasource.entities;
                entities.suspendEvents();
                for (var i=0; i < datasource.entities.values.length; i++){
                    var cesiumEntity = entities.values[i];
                    models.customizeEntity(cesiumEntity);
                    if (extrudeBool == true){
                        GeospatialSection.extrudeEntity(cesiumEntity);
                    }
                    self._defaultEntityCollectionNew.AddCesiumEntity(cesiumEntity);
                }
                console.log(self._defaultEntityCollectionNew);
                entities.resumeEvents();
                //return dfd;;
            });
        };

        this.LoadMeta = function(metaURL) {
            return $.getJSON(metaURL,
                function(meta) {
                    var variables = meta["Variables"];
                    $.each(variables, function(key,value){
                        //Create variable and append to default variable set
                        var variable = new models.Variable(key, value);
                        self._defaultVariableCollection.addVariable(variable);
                        //if there is dataset for a variable, add it to dataset collection
                        if (meta[key]){
                            var datasets = meta[key];
                            for (var datasetName in meta[key]){
                                var dataset = new models.Dataset(datasetName, datasets[datasetName].Settings);
                                for (var dataid in datasets[datasetName].Data){
                                    var data = new models.Data(dataid, datasets[datasetName].Data[dataid]["url"]);
                                    if (data.name === undefined){
                                        data.name = self._defaultEntityCollectionNew.getEntity(dataid).name;
                                    }
                                    dataset.adddata(dataid, data);
                                }
                                self._defaultDatasetCollection.addDataset(dataset, variable);
                            }
                        }
                    });
                }).done(function(){
                $.when(self.readCurrentTimeSeries()).done(function(){
                    console.log("start drawing");
                });
                //drawLegend(self._startColor, self._endColor, self._defaultRangeMin, self._defaultRangeMax);
                console.log(self._defaultDatasetCollection);
                console.log(self._defaultVariableCollection);
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

        this.updateTimeLineEnd = function(endTime){
            self._geospatialSection.viewer.clock.stopTime = endTime;
        };

        this.setTimeLine(
            new Cesium.JulianDate.fromIso8601('2014-01-01'),
            new Cesium.JulianDate.fromIso8601('2015-06-01'),
            5000
        );

        this.readTimeSeriesFromURL = function(dataset, variable){
            var dfd = $.Deferred();
            var readDeferralArray = [];
          for (var id in dataset.data){
              var readTask = readJsonTimeSeries(id, dataset.data[id], variable);
              readDeferralArray.push(readTask);
          }
            $.when.apply(null, readDeferralArray).done(function(){
                //alert("all done");
                console.log("all done 1");
                self._dataDrawn = true;
                dfd.resolve();

            });
            return dfd.promise();
        };

        function readJsonTimeSeries(id, data, variable){
            return $.getJSON(data.url, function(timeseries){
                addTimeSeries(variable, timeseries, data);
            });
        }

        this.readCurrentTimeSeries = function(){
            var variable = self._defaultVariableCollection.getCurrentVariable();
            var dataset = this._defaultDatasetCollection.getCurrentDataset(variable);
            var readProcess = self.readTimeSeriesFromURL(dataset, variable);
            readProcess.done(function(){
                console.log("all done read time series");
                self._dataDrawn = true;

                self.planarSection = new PlanarSection.HeatMap('#2DSection', self._defaultEntityCollectionNew, {
                    start: self._defaultTimeMin,
                    stop: self._defaultTimeMax,
                    lowerLimit: self._defaultRangeMin,
                    upperLimit: self._defaultRangeMax
                });

                self.planarSection.Initiate(self._defaultDatasetCollection.getCurrentDataset(self._defaultVariableCollection.getCurrentVariable()).data);
                console.log(self.planarSection);
                self.planarSection.Draw();

                /*
                self.heatmap = new heatmap.heatMap('#2DSection', self);
                self.heatmap.start = self._defaultTimeMin;
                self.heatmap.end = self._defaultTimeMax;
                self.heatmap.drawHeatMap(
                    self._defaultDatasetCollection.getCurrentDataset(self._defaultVariableCollection.getCurrentVariable()).data,
                    self._defaultRangeMin,
                    self._defaultRangeMax
                );
                */
            });
        };

        function addTimeSeries(variable, timeseries, data){
            var sampled = new Cesium.TimeIntervalCollectionProperty();
            var pos = 0;
            $.each(timeseries, function(key, values){

                var value = values[variable.name].replace(',', '');

                if (value > self._defaultRangeMax && $('#constantRange').prop('checked')==false){
                    self._defaultRangeMax = utilities.roundUp(value,1);
                }
               sampled.intervals.addInterval(Cesium.TimeInterval.fromIso8601({
                   iso8601: key,
                   isStartIncluded: true,
                   isStopIncluded: false,
                   data: value
               }));
            });
            data.timeInterval = sampled;
            var startDate = Cesium.JulianDate.toDate(sampled.intervals.get(0).start);
            var stopDate = Cesium.JulianDate.toDate(sampled.intervals.get(sampled.intervals.length-1).stop);
            if (self._defaultTimeMin == undefined || self._defaultTimeMin > startDate){
                self._defaultTimeMin = startDate;
                console.log(self._defaultTimeMin);
            }
            if (self._defaultTimeMax == undefined || self._defaultTimeMax < stopDate){
                self._defaultTimeMax = stopDate;
                console.log(self._defaultTimeMax);
            }
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
            //console.log("legend draw complete");
        }

        var helper = new Cesium.EventHelper();
        helper.add(this._geospatialSection.viewer.clock.onTick, tickUpdate, this);

        function tickUpdate(){
            drawLegend(self._startColor, self._endColor, self._defaultRangeMin, self._defaultRangeMax);
            self._geospatialSection.viewer.entities.suspendEvents();
            var variable = self._defaultVariableCollection.getCurrentVariable();
            if(variable == undefined){return;}
            var dataset = self._defaultDatasetCollection.getCurrentDataset(variable);
            if(dataset == undefined){return;}
            $.each(dataset.data, function(id, data){
                if (data.timeInterval == undefined){
                }
                else{
                    var newvalue = data.getValue(self._geospatialSection.viewer.clock.currentTime);
                    if (data.value != newvalue && self._defaultEntityCollectionNew.getEntity(id) != undefined) {
                        data.value = newvalue;
                        var entity = self._defaultEntityCollectionNew.getEntity(id);
                        entity.value = newvalue;
                        var weight = (newvalue-self._defaultRangeMin)/(self._defaultRangeMax - self._defaultRangeMin);
                        var color = utilities.colorFromGradient(self._startColor.toString(),self._endColor.toString(),weight);
                        entity.changeColor(color);
                    }
                }
            });
            self._geospatialSection.viewer.entities.resumeEvents();
        }

        this.updateEntityColors = function(){
            self._geospatialSection.viewer.entities.suspendEvents();
            $.each(self._defaultEntityCollectionNew.values, function(key, entity){
                var weight = (entity.value-self._defaultRangeMin)/(self._defaultRangeMax - self._defaultRangeMin);
                var color = utilities.colorFromGradient(self._startColor.toString(),self._endColor.toString(),weight);
                entity.changeColor(color);
            });
            self._geospatialSection.viewer.entities.resumeEvents();
        };

        //uses the id of the data to outline the entities
        this.outlineEntities = function(id){
            self._geospatialSection.viewer.entities.suspendEvents();
            var entity = self._defaultEntityCollectionNew.getEntity(id);
            $.each(entity.cesiumEntities, function(key, cesiumEntity){
                cesiumEntity.polygon.outline=true;
                cesiumEntity.polygon.outlineColor = Cesium.Color.BLACK;
            });
            self._geospatialSection.viewer.entities.resumeEvents();
        };

        this.deoutlineEntities = function(id){
            self._geospatialSection.viewer.entities.suspendEvents();
            var entity = self._defaultEntityCollectionNew.getEntity(id);
            $.each(entity.cesiumEntities, function(key, cesiumEntity){
                cesiumEntity.polygon.outline=false;
                cesiumEntity.polygon.outlineColor = Cesium.Color.BLACK;
            });
            self._geospatialSection.viewer.entities.resumeEvents();
        };

        this.focusEntities = function(id){
            var entities = self._defaultEntityCollectionNew.getEntity(id).cesiumEntities;
            self._geospatialSection.viewer.flyTo(entities);
        };

        this.brushEntities = function(ids){
            //console.log(ids);
            self._geospatialSection.viewer.entities.suspendEvents();
            for (var id in self._defaultEntityCollection){
                var entities = self._defaultEntityCollection[id];
                if ($.inArray(id, ids) != -1){
                    for (var key in entities){
                        var entity = entities[key];
                    }
                }
                else{
                    for (var key in entities){
                        var entity = entities[key];
                    };
                }
            }
            self._geospatialSection.viewer.entities.resumeEvents();
        };

        //Some worker functions for main.js
        //Some worker functions for main.js
        function updateColor(){
            console.log("color changed!");
            self._startColor = self._startColorPicker.spectrum('get').toHex();
            self._endColor = self._endColorPicker.spectrum('get').toHex();
            self.updateEntityColors();
            self.planarSection.updateColor("#" + self._startColor, "#" + self._endColor)
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
            //console.log("legend draw complete");
        }
    };
    return{
        Visualizer: Visualizer
    };
});
