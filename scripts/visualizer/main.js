define([
    'jquery',
    'Cesium',
    './template',
    './3dviewer',
    './models',
    './utilities'
],function(
    $,
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
        this._defaultEntityCollection = {};

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
                    var entity = entities.values[i];
                    models.customizeEntity(entity);
                    if (!self._defaultEntityCollection[entity.properties.Id]){
                        self._defaultEntityCollection[entity.properties.Id] = [entity];
                    }
                    else{
                        self._defaultEntityCollection[entity.properties.Id].push(entity);
                    }
                    if (extrudeBool == true){
                        GeospatialSection.extrudeEntity(entity);
                    }
                }
                //console.log(entities);
                //console.log(self._defaultEntityCollection);
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
                                    dataset.adddata(dataid, data);
                                }
                                self._defaultDatasetCollection.addDataset(dataset, variable);
                            }
                        }
                    });
                }).done(function(){
                $.when(self.readCurrentTimeSeries()).done(function(){
                    console.log("start drawing");
                    self._dataDrawn = true;
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
            console.log(self._defaultEntityCollection);
          for (var id in dataset.data){
              readJsonTimeSeries(id, dataset.data[id], variable);
          }
            self._dataDrawn = true;
            return dfd.promise();
        };

        function readJsonTimeSeries(id, data, variable){
            $.getJSON(data.url, function(timeseries){
                //console.log(self._defaultEntityCollection[id]);
                $.each(self._defaultEntityCollection[id], function(key, entity){
                    addTimeSeries(entity, variable, timeseries, data);
                    //console.log(entity);
                    data.entityId.push(entity.id);
                });
            });
        }

        this.readCurrentTimeSeries = function(){
            var dfd = $.Deferred();
            //console.log(self._defaultVariableCollection);
            //console.log(self._defaultDatasetCollection);
            var variable = self._defaultVariableCollection.getCurrentVariable();
            //console.log(variable);
            var dataset = this._defaultDatasetCollection.getCurrentDataset(variable);
            self.readTimeSeriesFromURL(dataset, variable);
            //console.log(self._defaultDatasetCollection.values);
            //console.log(self._defaultDatasetCollection.values[0]);
            //console.log(this._defaultEntityCollection);
            return dfd.promise();
        };

        function addTimeSeries(entity, variable, timeseries, data){
            //console.log(entity);
            var sampled = new Cesium.TimeIntervalCollectionProperty();
            var pos = 0;
            //console.log(timeseries.length);
            $.each(timeseries, function(key, values){
                //console.log(key);
                //get the value of the variable inside the sheet
                var value = values[variable.name].replace(',', '')

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
            /*
            var sampled = new Cesium.SampledProperty(Number);
            sampled.backwardExtrapolationDuration = 1;
            sampled.forwardExtrapolationType = Cesium.ExtrapolationType.HOLD;

            sampled.setInterpolationOptions({
                interpolationAlgorithm: Cesium.LinearApproximation,
                interpolationDegree: 0
            });

            //sampled.definitionChanged.addEventListener(console.log("new value"));
            for (var key in timeseries){
                sampled.addSample(Cesium.JulianDate.fromIso8601(key),
                    parseFloat(timeseries[key][variable.name].replace(',', '')));
            }
            */
            //entity.properties['values'][variable.name] = sampled;
            data.timeInterval = sampled;
            //console.log(sampled[0]);
            //console.log(entity);
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
            if (self._dataDrawn == false){
                return;
            }
            drawLegend(self._startColor, self._endColor, self._defaultRangeMin, self._defaultRangeMax);
            //console.log(this.viewer.clock.currentTime);
            //console.log(this._geospatialSection.viewer.entities.values);
            self._geospatialSection.viewer.entities.suspendEvents();
            var variable = self._defaultVariableCollection.getCurrentVariable();
            //console.log(variable);
            //console.log(self._defaultDatasetCollection.getCurrentDataset(variable).data);

            var dataset = self._defaultDatasetCollection.getCurrentDataset(variable);
            $.each(dataset.data, function(id, data){
                //console.log(id);
                //console.log(data);
                if (data.timeInterval == undefined){
                    $.each(data.entityId, function (entityid) {
                        //console.log(entityid);
                    });
                }
                else{
                    var newvalue = data.getValue(self._geospatialSection.viewer.clock.currentTime);
                    //console.log(newvalue);
                    //console.log(self._defaultEntityCollection[id]);
                    if (data.value != newvalue && self._defaultEntityCollection[id].length > 0) {
                        data.value = newvalue;
                        //console.log(newvalue);
                        //console.log(self._defaultEntityCollection[id]);
                        $.each(self._defaultEntityCollection[id], function (key, entity) {
                            //console.log(entity);
                            //var entity = self._defaultEntityCollection.getById(entityid);
                            entity.properties.value = newvalue;
                            colorEntity(entity);
                        })
                    }
                }
            });

            /*
            for (var i = 0; i < dataset.data.length; i++){
                var id = dataset.data[i];
                var data = dataset.data[id];
                var newvalue = data.getValue(self._geospatialSection.viewer.clock.currentTime);
                console.log(newvalue);
                if (data.value != newvalue){
                    data.value = newvalue;
                    //console.log(newvalue);
                    $.foreach(data.entityId, function(entityid){
                        var entity = self._defaultEntityCollection.getById(entityid);
                        entity.properties.value = newvalue;
                        colorEntity(entity);
                    })
                }
            }
            */

            /*
            $.each(this._defaultEntityCollection, function(key, entities){
                for (var i = 0; i< entities.length; i++){
                    var entity = entities[i];
                    if (!entity.properties.values["Electricity"]){continue;}
                    var newvalue = getData(entity, self._defaultVariableCollection.getCurrentVariable(),
                        self._geospatialSection.viewer.clock.currentTime);
                    //console.log(newvalue);
                    if (entity.properties.value !== newvalue){
                        //console.log(self._defaultRangeMax);
                        //console.log(newvalue);
                        entity.properties.value = newvalue;
                        if (newvalue > self._defaultRangeMax && $('#constantRange').prop('checked')==false){
                            self._defaultRangeMax = utilities.roundUp(newvalue,1);
                            updateEntityColors();
                        }
                        else{
                            colorEntity(entity);
                        }
                        //Update the data source for the 2d chart section

                        //console.log(entity);
                    }
                }

            });
            */
            self._geospatialSection.viewer.entities.resumeEvents();
        }

        function getData(entity, variable, time){
            return entity.properties.values[variable.name].getValue(time)
        }

        function updateEntityColors(){
            self._geospatialSection.viewer.entities.suspendEvents();
            $.each(self._defaultEntityCollection, function(key, entities){
                $.each(entities, function(id, entity){
                    colorEntity(entity);
                })
            });
            self._geospatialSection.viewer.entities.resumeEvents();
            //drawLegend(self._startColor, self._endColor, self._defaultRangeMin, self._defaultRangeMax);
        }

        function colorEntity(entity){
            var weight = (entity.properties.value-self._defaultRangeMin)/(self._defaultRangeMax - self._defaultRangeMin);
            entity.properties.color =  utilities.colorFromGradient(self._startColor.toString(),self._endColor.toString(),weight);
            entity.polygon.material = Cesium.Color.fromCssColorString("#"+ entity.properties.color);
            //entity.polygon.material = Cesium.Color.RED;
        }

        //Some worker functions for main.js
        //Some worker functions for main.js
        function updateColor(){
            console.log("color changed!");
            self._startColor = self._startColorPicker.spectrum('get').toHex();
            self._endColor = self._endColorPicker.spectrum('get').toHex();
            updateEntityColors();
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
