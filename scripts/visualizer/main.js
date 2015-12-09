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
        this._normalizationParameters = {};
        this._currentDataset = undefined;
        this._customProperties = [];
        this._currentData = undefined;

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

        this.initiate = function(geojsonURL, fileFormat, extrudeBool, metaUrl){
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
                    self._defaultEntityCollectionNew.AddCesiumEntity(cesiumEntity, self._customProperties);
                }
                console.log(self._defaultEntityCollectionNew);
                entities.resumeEvents();
                //return dfd;;
                populateCategories();
            });
        };

        this.LoadMeta = function(metaURL) {
            return $.getJSON(metaURL,
                function(meta) {
                    var variables = meta["Variables"];
                    $.each(variables, function(key,value){
                        //Create variable and append to default variable set
                        var variable = new models.Variable(key, value);
                        $('#control-variable').append($('<option>',{
                            value: variable.name,
                            text: variable.name + '(' + variable.unit + ')'
                        }));
                        self._defaultVariableCollection.addVariable(variable);
                        //if there is dataset for a variable, add it to dataset collection
                        if (meta[key]){
                            var datasets = meta[key];
                            for (var datasetName in meta[key]){
                                var dataset = new models.Dataset(datasetName, datasets[datasetName].Settings);
                                for (var dataid in datasets[datasetName].Data){
                                    var data = new models.Data(dataid, datasets[datasetName].Data[dataid]["url"]);
                                    if (data.name === undefined){
                                        //data.name = self._defaultEntityCollectionNew.getEntity(dataid).name;
                                        data.name = dataid;
                                    }
                                    dataset.adddata(dataid, data);
                                }
                                self._defaultDatasetCollection.addDataset(dataset, variable);
                            }
                        }
                    });

                    self._normalizationParameters = meta["Normalization"];
                    $('#control-normalize').append($('<option>',{
                        value: "None",
                        text: "None"
                    }));
                    $.each(self._normalizationParameters, function(key, value){
                        $('#control-normalize').append($('<option>',{
                            value: key,
                            text: value
                        }));
                    });
                    self._customProperties = meta["Custom_Properties"];
                    //console.log(self._customProperties);
                }).done(function(){
                loadDatasetOptions();
                $.when(self.readCurrentTimeSeries()).done(function(){
                    self._currentDataset = self._defaultDatasetCollection.getCurrentDataset(self._defaultVariableCollection.getCurrentVariable());
                    console.log(self._currentDataset);
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
            for (var key in timeseries){
                if ( timeseries.hasOwnProperty(key) ){
                    var values = timeseries[key];
                    var value = parseFloat(values[variable.name].replace(',', ''));

                    if (value > self._defaultRangeMax && $('#constantRange').prop('checked')==false){
                        self._defaultRangeMax = utilities.roundUp(value,1);
                    }
                    sampled.intervals.addInterval(Cesium.TimeInterval.fromIso8601({
                        iso8601: key,
                        isStartIncluded: true,
                        isStopIncluded: false,
                        data: value
                    }));
                    if (value < data.minimum){
                        data.minimum = value;
                    }
                    if (value > data.maximum){
                        data.maximum = value;
                    }
                }
            }
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
            $.each(self._defaultEntityCollectionNew.values, function(id, entity){
                if(id == undefined){return;}
                var data = self._currentDataset.getdata(id);
                //console.log(data);
                if(data !== undefined){
                    if (data.timeInterval == undefined){
                    }
                    else{
                        var newValue = data.getValue(self._geospatialSection.viewer.clock.currentTime);
                        var normalization  = $('#control-normalize').val();
                        if ( newValue == undefined){
                            //console.log('no data');
                            entity.value = 0.0;
                            entity.changeColor('FFFFFF');
                            return true;
                        }
                        if (normalization !== 'None'){
                            newValue = newValue/entity.properties[normalization];
                        }
                        if (entity.value !== newValue) {
                            entity.value = newValue;
                            var weight = (newValue-self._defaultRangeMin)/(self._defaultRangeMax - self._defaultRangeMin);
                            var color = 'FFFFFF';
                            if (weight > 1.0){
                                color = '000000';
                            }
                            else if (weight < 0.0){
                                color = 'FFFFFF'
                            }
                            else{
                                color = utilities.colorFromGradient(self._startColor.toString(),self._endColor.toString(),weight);
                            }
                            entity.changeColor(color);
                        }
                    }
                }
                else{
                    //entity.changeAvailability(false);
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

        function loadDatasetOptions(){
            $('#control-dataset').find('option').remove().end();
            var datasets = self._defaultDatasetCollection.getDatasetList(self._defaultVariableCollection.getCurrentVariable());
            if (datasets == undefined){return;}
            $.each(datasets, function(i, dataset){
                $('#control-dataset').append($('<option>',{
                    value: dataset.name,
                    text: dataset.name
                }))
            });
        }

        function changeDataset(){
            self._defaultDatasetCollection.setCurrentDataset(self._defaultVariableCollection.getCurrentVariable(), $('#control-dataset').value);
        }

        $('#control-dataset-confirm').on('click', function(){
            changeDataset();
        });

        $('#control-variable').on('change', function(){
            self._defaultVariableCollection.setVariableByName(this.value);
            loadDatasetOptions();
        });

        function populateCategories(){
            $('#control-category').find('option').remove().end();
            $('#control-category').append($('<option>', {
                value: 'All',
                text: 'All'
            }));
            $.each(self._defaultEntityCollectionNew.categories, function(key){
                $('#control-category').append($('<option>', {
                    value: key,
                    text: key
                }));
            })
        }

        $('#control-category').on('change', function(){
            self._defaultEntityCollectionNew.highLightCategory(this.value)
        });

        $('#control-normalize').on('change', function(){
            self._defaultRangeMax = 0.0;
            updateMaximum();
            console.log(self._defaultRangeMax);
        });

        function updateMaximum(){
            var datas = self.getCurrentData().data;
            var normalization = $('#control-normalize').val();
            $.each(datas, function(id, data){
                var entity = self._defaultEntityCollectionNew.getEntity(id);
                var newValue = 0.0;
                if (normalization == "None"){
                    newValue = data.maximum
                }
                //console.log(entity);
                else if (entity !== undefined){
                    if (entity.properties[normalization] !== undefined){
                        newValue = data.maximum/self._defaultEntityCollectionNew.getEntity(id).properties[normalization];
                    }
                }
                if (newValue > self._defaultRangeMax){
                    self._defaultRangeMax  = utilities.roundUp(newValue,1);
                }
            });
        }

        function updateCurrentData(){
            $.each(data.timeInterval.intervals._intervals, function(i, interval){
                var value = parseFloat(interval.data);
                if (value/parseFloat(entity.properties[normalization])){}
            });
        }

    };

    Visualizer.prototype.getCurrentData = function(){
      return  this._defaultDatasetCollection.getCurrentDataset(this._defaultVariableCollection.getCurrentVariable());
    };
    return{
        Visualizer: Visualizer
    };
});
