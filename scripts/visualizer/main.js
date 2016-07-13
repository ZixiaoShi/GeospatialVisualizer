define([
    'jquery',
    'Cesium',
    'noUiSlider',
    'd3',
    './template',
    './3dviewer',
    './models',
    './utilities',
    './heatmap',
    './2dviewer'
],function(
    $,
    Cesium,
    noUiSlider,
    d3,
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
        this._planarDrawn = false;

        this.slider = noUiSlider.create(document.getElementById('visualizer-slider'),{
            start: [0.0, 100.0],
            connect: true,
            range:{
                'min': 0.0,
                'max': 100.0
            }
        });

        this._customMin = document.getElementById('StartRange');
        this._customMax = document.getElementById('EndRange');

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
                /*
                $.when(self.readCurrentTimeSeries()).done(function(){
                    self._currentDataset = self._defaultDatasetCollection.getCurrentDataset(self._defaultVariableCollection.getCurrentVariable());
                    console.log("start drawing");
                });
                //drawLegend(self._startColor, self._endColor, self._defaultRangeMin, self._defaultRangeMax);
                console.log(self._defaultDatasetCollection);
                */
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
            var dfd = $.Deferred();
            var variable = self._defaultVariableCollection.getCurrentVariable();
            var dataset = this._defaultDatasetCollection.getCurrentDataset(variable);
            var readProcess = self.readTimeSeriesFromURL(dataset, variable);
            readProcess.done(function(){
                self._dataDrawn = true;
                dfd.resolve();
            });
            return dfd.promise();
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

        function drawPlanarSection(){
            self.planarSection = new PlanarSection.HeatMap('#2DSection', self._defaultEntityCollectionNew, {
                start: self._defaultTimeMin,
                stop: self._defaultTimeMax,
                lowerLimit: self._defaultRangeMin,
                upperLimit: self._defaultRangeMax
            });
            //console.log(self._currentDataset.data);
            self.planarSection.Initiate(self._currentDataset.data);
            self.planarSection.Draw();

            self.planarSection.rectangles.on('click', function(){
                var time  = self.planarSection.x.invert(d3.mouse(this)[0]);
                console.log("switch to" + time.toString());
                self._geospatialSection.viewer.clock.currentTime = Cesium.JulianDate.fromDate(time);
                //self.timeLine(time);
            });
        }

        var helper = new Cesium.EventHelper();
        helper.add(this._geospatialSection.viewer.clock.onTick, clockUpdate, this);

        function clockUpdate(){
            tickUpdate(false);
        }

        function tickUpdate(all){
            if (self._currentDataset == undefined){
                return;
            }
            self._geospatialSection.viewer.entities.suspendEvents();
            if (self.planarSection !== undefined){
                self.planarSection.timeLine(Cesium.JulianDate.toDate(self._geospatialSection.viewer.clock.currentTime));
            }
            $.each(self._defaultEntityCollectionNew.values, function(id, entity){
                if(id == undefined){return;}
                var data = self._currentDataset.getdata(id);
                //console.log(data);
                if(data !== undefined){
                    if (data.timeInterval == undefined){
                    }
                    else{
                        var newValue = data.getValue(self._geospatialSection.viewer.clock.currentTime);
                        if ( newValue == undefined){
                            //console.log('no data');
                            entity.value = 0.0;
                            entity.changeColor('FFFFFF');
                            entity.changeAvailability(false);
                            return true;
                        }
                        if (entity.value !== newValue || all == true) {
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
                            if ($('#customRange').is(':checked')){
                                if (newValue > self._customMax.value){
                                    color = '000000';
                                }
                                if (newValue < self._customMin.value){
                                    color = 'FFFFFF'
                                }
                            }
                            entity.changeColor(color);
                        }
                    }
                }
                else{
                    entity.changeAvailability(false);
                }
            });
            self._geospatialSection.viewer.entities.resumeEvents();
        }

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
            tickUpdate(true);
            drawLegend(self._startColor, self._endColor, self._defaultRangeMin, self._defaultRangeMax);
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
            var unit = "";
            if(self._defaultVariableCollection.getCurrentVariable() !== undefined){
                unit = self._defaultVariableCollection.getCurrentVariable().unit;
            };
            ctx.fillText(rangeMin + unit,1,60);
            ctx.textAlign = "center";
            ctx.fillText((((rangeMin+rangeMax)/2)).toString() + unit, 200, 60);
            ctx.textAlign = "right";
            ctx.fillText(rangeMax + unit,399,60);
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
            var readProcess = self.readCurrentTimeSeries();
            readProcess.done(function(){
                self._currentDataset = self._defaultDatasetCollection.getCurrentDataset(self._defaultVariableCollection.getCurrentVariable());
                updateMaximum();
                drawLegend(self._startColor, self._endColor, self._defaultRangeMin, self._defaultRangeMax);
                $('control-normalize').val("None");
                normalizeCurrentData();


                if (self._planarDrawn == false){
                    drawPlanarSection();
                    self._planarDrawn = true;
                }
                else{
                    self.planarSection.update("#" + self._startColor, "#" + self._endColor, self._defaultRangeMin, self._defaultRangeMax, self._currentDataset.data, self._defaultEntityCollectionNew)
                }


            });

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
            normalizeCurrentData();
            updateMaximum();
            drawLegend(self._startColor, self._endColor, self._defaultRangeMin, self._defaultRangeMax);
            self.planarSection.update("#" + self._startColor, "#" + self._endColor, self._defaultRangeMin, self._defaultRangeMax, self._currentDataset.data, self._defaultEntityCollectionNew);
            self.planarSection.rectangles.on('click', function(){
                var time  = self.planarSection.x.invert(d3.mouse(this)[0]);
                console.log("switch to" + time.toString());
                self._geospatialSection.viewer.clock.currentTime = Cesium.JulianDate.fromDate(time);
                //self.timeLine(time);
            });
            //console.log(self._currentDataset);
            //console.log(self._defaultRangeMax);
        });

        function updateMaximum(){
            var datas = self._currentDataset.data;
            self._defaultRangeMax = undefined;
            $.each(datas, function(id, data){
                if (self._defaultRangeMax == undefined || self._defaultRangeMax < data.maximum){
                    self._defaultRangeMax = utilities.roundUp(data.maximum, 1.0);
                }
            });
            self.slider.updateOptions({
                range: {
                    'min': self._defaultRangeMin,
                    'max': self._defaultRangeMax
                }
            });
            self.slider.set([self._defaultRangeMin, self._defaultRangeMax]);
        }

        function normalizeCurrentData(){
            var normalization = $('#control-normalize').val();
            var dataset = self._defaultDatasetCollection.getCurrentDataset(self._defaultVariableCollection.getCurrentVariable());
            //self._currentDataset = JSON.parse(JSON.stringify(self._defaultDatasetCollection.getCurrentDataset(self._defaultVariableCollection.getCurrentVariable())));
            self._currentDataset = new models.Dataset(dataset.name + " normalized by " + normalization, dataset.settings);
            console.log(self._currentDataset);
            var datas = dataset.data;
            $.each(datas, function(id, data){
                var newdata = new models.Data(id, "");
                newdata.timeInterval = new Cesium.TimeIntervalCollectionProperty();
                self._currentDataset.adddata(id, newdata);

                var entity = self._defaultEntityCollectionNew.getEntity(id);
                if (entity == undefined){return true; }

                newdata.name = entity.name;

                var parameter = 1.0 ;
                if (normalization !== "None" && entity.properties[normalization] !== undefined){
                    parameter = parseFloat(entity.properties[normalization])
                }
                $.each(data.timeInterval.intervals._intervals, function(i, interval){
                    var value;
                    if (parameter == 0.0){
                        value = parseFloat(interval.data);
                    }
                    else{
                        value = parseFloat(interval.data)/parameter;
                        if (newdata.maximum == undefined || value > newdata.maximum){
                            newdata.maximum = value;
                        }
                        if (newdata.minimum == undefined || value < newdata.minimum){
                            newdata.minimum = value;
                        }
                    }
                    newdata.timeInterval.intervals.addInterval(new Cesium.TimeInterval({
                        start: interval.start,
                        stop: interval.stop,
                        isStartIncluded: interval.isStartIncluded,
                        isStopIncluded: interval.isStopIncluded,
                        data: value
                    }));
                });
            });
        }

        var geospatialScreenHandler = new Cesium.ScreenSpaceEventHandler(this._geospatialSection.viewer.scene.canvas);
        geospatialScreenHandler.setInputAction(function(dbClick){
            //console.log(dbClick.position);
            var cesiumEntity = utilities.pickEntity(self._geospatialSection.viewer, dbClick.position);
            if (cesiumEntity == undefined){
                $('.visualizer-infobox-table').html('');
                return;
            }
            var entity = self._defaultEntityCollectionNew.getEntity(cesiumEntity.properties.Id);
            //entity.changeAvailability(true);
            $('.visualizer-infobox-table').html('');
            var unit = self._defaultVariableCollection.getCurrentVariable().unit;
            //console.log(entity.name);
            addinfoLine('Name', entity.name);
            addinfoLine('Current Value', entity.value + unit);
            for (var key in entity.properties){
                addinfoLine(key, entity.properties[key]);
            }
            addsubLevel("Floor Level");
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        function addinfoLine(key, value){
            $('.visualizer-infobox-table')
                .append($('<tr>')
                    .append($('<td>',{
                        text: key
                    }))
                    .append($('<td>', {
                        text: value.toString()
                    }))
                )
        }

        function addsubLevel(value){
            $('.visualizer-infobox-table')
                .append($('<button>',{
                    text:value
                }));
        }

        this._customMin.addEventListener('change', function(){
            self.slider.set(this.value, null);
        });

        this._customMax.addEventListener('change', function(){
            self.slider.set(null, this.value);
        });

        this.slider.on('update', function(values, handle){
            var value = values[handle];

            if ( handle ) {
                self._customMax.value = value;
            } else {
                self._customMin.value = value;
            }

            tickUpdate(true);
        });

        $('#customRange').on('click', function(){
           tickUpdate(true);
        });

    };

    Visualizer.prototype.getCurrentData = function(){
      return  this._defaultDatasetCollection.getCurrentDataset(this._defaultVariableCollection.getCurrentVariable());
    };
    return{
        Visualizer: Visualizer
    };
});
